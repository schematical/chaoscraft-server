import { BotSocket } from './SocketManager';
import { App } from '../App';
import * as config from 'config';
class FitnessTest{
    age:number = null;
    generation:number = null;
    testFun:any = null;
    constructor(age, generation, testFun){
        this.age = age;
        this.generation = generation;
        this.testFun = testFun;
    }
    pass(){

    }
    fail(){

    }
    error(){

    }
    exec(bot, stats, ){

    }
}
class FitnessManager{
    botSocket:BotSocket = null;
    app:App = null;
    tests:Array<any> = [];
    constructor(options:any){
        this.botSocket = options.botSocket;
        this.app = options.app;
        if(!this.botSocket){
            throw new Error("No `botSocket` passed in");
        }
        if(!this.app){
            throw new Error("No `app` passed in");
        }
    }
    addTest(age, generation, testFun){
        this.tests.push(new FitnessTest(age, generation, testFun));
    }
    runTests(bot, payload){
        let i = 0;
        let running = true;
        while(running){
            if(i > this.tests.length){
                running = false;
            }
        }
    }
    testFitness(bot, payload:any){


            return new Promise((resolve, reject)=>{

                let multi = this.app.redis.clients.chaoscraft.multi();
                multi.hgetall('/bots/' + payload.username + '/stats')
                return multi.exec((err, stats)=>{
                    if(err){
                        return reject(err);
                    }
                    return resolve(stats[0]);
                })
            })


            .then((stats:any)=>{

                let flagBot = false;

                if(
                    bot.age > 7 &&
                    payload.distanceTraveled < 20
                ) {
                    return this.botSocket.onClientNotFiring(payload, {
                        death_reason:'failed_to_travel'
                    });
                }

                if(
                    bot.age > 14 &&
                    bot.generation > 2 &&
                    !stats.dig
                ){
                    return this.botSocket.onClientNotFiring(payload, {
                        death_reason:'failed_to_dig'
                    });
                }

               /* if(
                    bot.age > 19 &&
                    bot.generation > 4 &&
                    !stats.equip
                ){
                    return this.botSocket.onClientNotFiring(payload, {
                        death_reason:'failed_to_equip'
                    });
                }*/

                if(
                    bot.age > 25 &&
                    bot.generation > 8
                ){
                    if(!stats.place_block_attempt){
                        return this.botSocket.onClientNotFiring(payload, {
                            death_reason:'failed_to_place_block_attempt'
                        });
                    }else{
                        flagBot = true;
                    }
                }

                if(
                    bot.age > 50 &&
                    bot.generation > 16 &&
                    !stats.craft
                ){
                    return  this.botSocket.onClientNotFiring(payload, {
                        death_reason:'failed_to_craft'
                    });
                }
                if(
                    bot.age > 75 &&
                    bot.generation > 32 &&
                    !stats.attack
                ){
                    return  this.botSocket.onClientNotFiring(payload, {
                        death_reason:'failed_to_attack'
                    });
                }


                if(
                    bot.age > 100
                ){
                    //Its just time to die
                    return  this.botSocket.onClientNotFiring(payload, {
                        death_reason:'got_old'
                    });
                }


                if(bot.age % <number>config.get('brain.spawn_children_pong_ct') === 0){
                    return  this.botSocket.spawnChildren(payload);
                }
                if(!flagBot) {
                    return;
                }
                if(bot.flagged){
                    return;
                }
                bot.flagged = true;

            })
    }
}
export { FitnessManager }