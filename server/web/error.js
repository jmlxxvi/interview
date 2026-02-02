import { timestamp, uuid } from '../utils/index.js'
import config from '../config.js'

// Error handler
// https://expressjs.com/en/guide/error-handling.html
export function middlewareError (err, req, res, _next) {
  // const baseUrl = req.baseUrl

  console.error('middlewareError: ', err)

  // if (baseUrl === "/api") {

  //     const response = {
  //         origin: "unknown",
  //         status: {
  //             error: true,
  //             code: 1100,
  //             message: err.message,
  //             timestamp: timestamp(true),
  //             elapsed: -1,
  //             request_id: uuid(),
  //             executor: uuid(),
  //         },
  //         data: null
  //     };

  //     // await saveExecuteResponse("http", response);

  //     return res.json(response);

  // } else {

  //     return res.status(500).json(operationOutcomeTemplate("error", err.message || err));

  // }

  const response = {
    origin: 'unknown',
    status: {
      error: true,
      code: 1100,
      message: err.message,
      timestamp: timestamp(true),
      elapsed: -1,
      request_id: uuid(),
      executor: uuid()
    },
    data: null
  }

  return res.json(response)
};

export function serverErrorMessage (error) {
  const message = (typeof error === 'string') ? error : error.message || error

  return config.server.environment === 'production' ? 'Internal server error' : message
}

/*
{
    "resourceType": "OperationOutcome",
    "text": {
        "status": "generated",
        "div": "<div xmlns=\"http://www.w3.org/1999/xhtml\"><h1>Operation Outcome</h1><table border=\"0\"><tr><td style=\"font-weight: bold;\">ERROR</td><td>[]</td><td>HAPI-0450: Failed to parse request body as JSON resource. Error was: HAPI-1861: Failed to parse JSON encoded FHIR content: Unexpected character ('}' (code 125)): was expecting double-quote to start field name at [line: 38, column: 2]</td></tr></table></div>"
    },
    "issue": [
        {
            "severity": "error",
            "code": "processing",
            "diagnostics": "HAPI-0450: Failed to parse request body as JSON resource. Error was: HAPI-1861: Failed to parse JSON encoded FHIR content: Unexpected character ('}' (code 125)): was expecting double-quote to start field name\n at [line: 38, column: 2]"
        }
    ]
}
*/
