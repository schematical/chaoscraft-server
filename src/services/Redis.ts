import * as config from 'config';
import * as redis from 'redis';
class Redis{
    protected _clients:any = {};
    constructor(){

        let redisConfig = config.get('redis');

        Object.keys(redisConfig).forEach((key)=>{
            console.log('redisConfig[key]', redisConfig[key]);
            this._clients[key] = redis.createClient(redisConfig[key]);
            this._clients[key] .on("error", function (err) {
                console.log("Error " + err);
            });
        })
    }
    get clients():any{
        return this._clients;
    }
}
export { Redis };