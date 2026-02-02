import config from '../../../../config.js'
import log from '../../../../platform/log.js'
import session from '../../../../platform/session.js'
import security from '../../../../platform/security.js'
import { db } from '../../../../platform/db/index.js'
import { serviceEmailSend } from '../../../../platform/services/email/index.js'
import { template } from '../../../../platform/services/email/templates/auth/recovery.js'
import { randomHexaString, timestamp } from '../../../../utils/index.js'
// import { fetchUserFromIdToken } from "../../../platform/services/google/login.js";

import { securityService } from '../../../../services/securityService.js'

import { userRepository } from '../../../../repositories/auth/user.js'
import { ApiResponseError, ApiResponseOk } from '../../../../utils/response.js'

const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax', // or 'strict' or 'none' based on your requirements
  maxAge: 24 * 60 * 60 * 1000,
  path: '/'
}

export const logoff = async (_args, context) => {
  await session.destroy({ token: context.token, execId: context.execId })

  context.cookies.clear(config.security.tokenKey, cookieOptions)

  return ApiResponseOk()
}

export const login = async (args, context) => {
  const { execId } = context

  const { email, password } = args
  console.log('email, password: ', email, password)

  const userDataRow = await userRepository.findByEmailCaseInsensitive(context, email)
  console.log('userDataRow: ', userDataRow)

  if (userDataRow === null) {
    return ApiResponseError(1001, 'Invalid username or password')
  }
  const {
    userId,
    userName,
    userEmail,
    passwordHash,
    entityName,
    entityId,
    plantName,
    plantCode,
    plantId
  } = userDataRow
  console.log('userDataRow: ', userDataRow)

  const passwordMatch = await security.passwordCompare(password, passwordHash)
  console.log('passwordMatch: ', passwordMatch)

  if (passwordMatch) {
    log.debug(`User [${email}] passwordMatch`, 'auth/public:login', execId)

    const token = session.token()

    const authorizationData = await securityService.getUserAuthorization(context, userId)

    await session.create({
      token,
      data: {
        entityId,
        entityName,
        plantName,
        plantCode,
        plantId,
        userId,
        userName,
        userEmail,
        userIsAdmin: await securityService.checkUserIsAdmin(context, userId),
        permissions: authorizationData.permissions,
        roles: authorizationData.roles
      },
      execId
    })

    context.cookies.set(config.security.tokenKey, token, cookieOptions)

    return ApiResponseOk({ userName, userEmail, entityName, entityId, token })
  } else {
    log.debug(`User [${email}] cannot login`, 'auth/public:login', execId)

    return ApiResponseError(1001, 'Invalid username or password')
  }
}

/**
 * Recovers a user's password given an email address.
 *
 * @param {Object} args - The input arguments.
 * @param {string} args.email - The email address.
 * @param {string} [args.language] - The language code.
 * @param {Object} context - The function context.
 * @param {string} context.execId - The execution id.
 *
 * @return {Promise<Object>} The response object.
 * @property {boolean} error - The error status.
 * @property {number} code - The error code.
 * @property {string} message - The error message.
 * @property {Object} data - The response data.
 */
export const recovery = async (args, context) => {
  const { execId } = context

  const { email } = args

  const query = `
        select 
            usr.id,
            usr.email,
            usr.full_name as "fullName",
            usr.passwordHash as "passwordHash",
            org.id as "orgId" 
        from 
        auth.user usr 
        join fman.users_entities uen on (usr.id = uen.user_id)
        join fman.entities org on (org.id = uen.entity_id)
        where lower(usr.email) = lower({email})`

  const userData = await db.query(query, { email })

  if (userData.length > 0) {
    const recoveryToken = randomHexaString(32)

    const { fullName } = userData[0]

    await db.query(`
            update auth.user
            set 
                recoveryToken = {recoveryToken}, 
                recoveryTimestamp = {recoveryTimestamp}
            where lower(email) = lower({email})`,
    {
      recoveryToken,
      recoveryTimestamp: timestamp() + 3600 * 1000,
      email
    }
    )

    const tpl = template(`${fullName}`, `${config.server.base_url}/login.html?action=reset&token=${recoveryToken}`)

    serviceEmailSend({
      to: email,
      subject: 'Recuperación de contraseña',
      body: tpl
    })

    return { error: false, code: 1000, message: '', data: null }
  } else {
    log.debug(`User [${email}] not found`, 'auth/public:recover', execId)

    return { error: false, code: 1004, message: '', data: null }
  }
}

/**
 * Resets a user's password given a recovery token.
 *
 * @param {Object} args - The input arguments.
 * @param {string} args.token - The recovery token.
 * @param {string} args.password - The new password.
 * @param {string} [args.language] - The language code.
 * @param {Object} context - The function context.
 * @param {string} context.execId - The execution id.
 *
 * @return {Promise<Object>} The response object.
 * @property {boolean} error - The error status.
 * @property {number} code - The error code.
 * @property {string} message - The error message.
 * @property {Object} data - The response data.
 */
export const reset = async (args, context) => {
  const { execId } = context

  const { token: recoveryToken, password } = args

  const query = `
        select 
            usr.recoveryTimestamp as "recoveryTimestamp"
        from 
        auth.user usr 
        join fman.users_entities uen on (usr.id = uen.user_id)
        join fman.entities org on (org.id = uen.entity_id)
        where usr.recoveryToken = {recoveryToken}`

  const userData = await db.query(query, { recoveryToken })

  if (userData.length > 0) {
    const { recoveryTimestamp } = userData[0]

    if (recoveryTimestamp > timestamp()) {
      const passwordHash = await security.passwordHash(password)
      console.log('passwordHash: ', passwordHash)

      await db.query(`
                update auth.user
                set 
                    passwordHash = {passwordHash},
                    recoveryToken = null, 
                    recoveryTimestamp = null
                where recoveryToken = {recoveryToken}`,
      { recoveryToken, passwordHash }
      )

      return { error: false, code: 1004, message: 'Contraseña reestablecido', data: null }
    } else {
      log.debug('Expired token', 'auth/public:recover', execId)

      return { error: true, code: 1000, message: 'El plazo para recuperar la contraseña ha caducado', data: null }
    }
  } else {
    log.debug('Token not found', 'auth/public:recover', execId)

    return { error: true, code: 1004, message: 'Token inválido', data: null }
  }
}

/*
export const google_verify = async (args, context) => {

    const { execId } = context;

    const { code, language } = args;
    console.log('code: ', code);

    const oauthRequestUrl = new URL(process.env.GOOGLE_OAUTH_TOKEN_ENDPOINT);

    const oauthRequestBody = new URLSearchParams({
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
    });

    const oauthResponse = await fetch(oauthRequestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: oauthRequestBody.toString(),
    });

    if (!oauthResponse.ok) {
        return { error: true, code: 1004, message: `OAuth request failed: ${oauthResponse.statusText}`, data: null };
    }

    const oauthResponseData = await oauthResponse.json();

    const userData = await fetchUserFromIdToken(oauthResponseData.id_token);
    console.log('userData: ', userData);

    userData:  {
        iss: 'https://accounts.google.com',
        azp: '211175662167-i8kn3pe9l2518jipp3igt5tep30l29cq.apps.googleusercontent.com',
        aud: '211175662167-i8kn3pe9l2518jipp3igt5tep30l29cq.apps.googleusercontent.com',
        sub: '114248403722376753079',
        email: 'juanmartinguillen@gmail.com',
        email_verified: true,
        at_hash: 'Z38sIqZBIvvVH5Qh4UahxQ',
        name: 'Juan Martin Guillen',
        picture: 'https://lh3.googleusercontent.com/a/ACg8ocIYYjJDHGZE-tNSOZ2n1KsOwUx463-ALZ3lQNS8mA-hYsqgvw=s96-c',
        given_name: 'Juan Martin',
        family_name: 'Guillen',
        iat: 1731419359,
        exp: 1731422959
    }

    if (userData?.email) {

        const { email, given_name, family_name } = userData;

        if (language) {
            await db.query(`
                update auth.user
                set language_code = {language}
                where lower(email) = lower({email})`,
                { language, email });
        }

        const query = `
            select
                usr.id,
                usr.email,
                usr.first_name,
                usr.last_name,
                usr.first_name || ' ' || usr.last_name as full_name,
                usr.passwordHash,
                usr.language_code,
                usr.is_admin,
                org.id as org_id
            from
            auth.user usr
            join auth.organization org on (usr.org_id = org.id)
            where lower(usr.email) = lower({email})`;

        const userData = await db.query(query, { email });

        if (userData.length > 0) {

            const { id: user_id, email, org_id, full_name, language_code, is_admin } = userData[0];

            log.debug(`User [${email}] passwordMatch`, "auth/public:login", execId);

            const token = session.token();

            await session.create({
                token,
                org_id,
                user_id,
                data: {
                    org_id,
                    email,
                    full_name,
                    language_code,
                    is_admin
                },
                execId
            });

            return { error: false, code: 1000, data: { email, token } };

        } else {

            const user_id = uuid();
            const org_id = 'f0292882-d91c-4ef3-aa08-060b8c24b0d1' // TODO create organization for new users or find a way to add them to an existing organization

            await db.insert({
                table: "auth.user",
                values: {
                    id: user_id,
                    email,
                    first_name: userData.given_name,
                    last_name: userData.family_name,
                    language_code: language,
                    is_admin: false,
                    org_id,
                    passwordHash: "authentication-via-oauth2",
                    created_by: user_id,
                    created_ts: timestamp(true)
                }
            });

            const token = session.token();

            await session.create({
                token,
                org_id,
                user_id,
                data: {
                    org_id,
                    email,
                    full_name: given_name + ' ' + family_name,
                    language_code: language,
                    is_admin: false
                },
                execId
            });

            return { error: false, code: 1000, data: { email, token } };

        }

    } else {

        return { error: true, code: 1004, message: "Unable to login", data: null };

    }

};

*/
