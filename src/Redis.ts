import * as config from 'config';
import * as redis from 'redis';
class Redis{
    protected clients:any = {};
    constructor(){
        let redisConfig = config.get('redis');

        Object.keys(redisConfig).forEach((key)=>{
            this.clients[key] = redis.createClient(redisConfig[key]);
            this.clients.redis[key] .on("error", function (err) {
                console.log("Error " + err);
            });
        })
    }
}
export { Redis }