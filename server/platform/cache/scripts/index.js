import { defineScript } from 'redis'

export default {

  setIfHigher: defineScript({
    NUMBER_OF_KEYS: 1,
    SCRIPT: `local c = tonumber(redis.call("get", KEYS[1]))
        if c then
            if tonumber(ARGV[1]) > c then
                redis.call("set", KEYS[1], ARGV[1])
                return tonumber(ARGV[1])
            else
                return c
            end
        else
            redis.call("set", KEYS[1], ARGV[1])
            return tonumber(ARGV[1])
        end`,
    transformArguments (key, toAdd) {
      return [key, toAdd.toString()]
    },
    transformReply (reply) {
      return reply
    }
  }),

  setIfLower: defineScript({
    NUMBER_OF_KEYS: 1,
    SCRIPT: `local c = tonumber(redis.call("get", KEYS[1]))
        if c then
            if tonumber(ARGV[1]) < c then
                redis.call("set", KEYS[1], ARGV[1])
                return tonumber(ARGV[1])
            else
                return c
            end
        else
            redis.call("set", KEYS[1], ARGV[1])
            return tonumber(ARGV[1])
        end`,
    transformArguments (key, toAdd) {
      return [key, toAdd.toString()]
    },
    transformReply (reply) {
      return reply
    }
  })
}

/*

ZADDIFHIGHER.lua

local c = tonumber(redis.call("zscore", KEYS[1], ARGV[1]))
if c then
    if tonumber(KEYS[2]) > c then
        redis.call("zadd", KEYS[1], KEYS[2], ARGV[1])
        return tonumber(KEYS[2]) - c
    else
        return 0
    end
else
    redis.call("zadd", KEYS[1], KEYS[2], ARGV[1])
    return "OK"
end

ZADDIFLOWER.lua

local c = tonumber(redis.call("zscore", KEYS[1], ARGV[1]))
if c then
    if tonumber(KEYS[2]) < c then
        redis.call("zadd", KEYS[1], KEYS[2], ARGV[1])
        return tonumber(KEYS[2]) - c
    else
        return 0
    end
else
    redis.call("zadd", KEYS[1], KEYS[2], ARGV[1])
    return "OK"
end

*/
