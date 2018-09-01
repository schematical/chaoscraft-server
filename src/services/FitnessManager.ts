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
    testFitness(bot, payload:any) {
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
        .then((stats:any)=> {
            if(
                bot.age > 2 &&
                payload.distanceTraveled < 20
            ) {
                return this.botSocket.onClientNotFiring(payload, {
                    death_reason:'failed_to_travel'
                });
            }
            if(
                bot.age > 20
            ){
                //Its just time to die
                return  this.botSocket.onClientNotFiring(payload, {
                    death_reason:'got_old'
                });
            }

        });

    }
    testAchievement(bot:any, payload:any, multi:any){
        switch(payload.type){




           /* case('attack_success'):
                return this.botSocket.spawnChildren(payload);
            //break;
            case('kill'):
                return this.botSocket.spawnChildren(payload, { litterSizeMultiplier: 10 });*/
            case('player_collect'):
            case('dig'):
                switch(payload.target.type){
                    case(17):
                    case('17:1'):
                    case('17:2'):
                    case('17:3'):
                    case('162'):
                    case(162):
                    case('162:1'):
                        return this.botSocket.spawnChildren(payload, { });

                    case(268)://Wooden Sword
                    case(269)://Wooden Shovel
                    case(270)://Wooden Pickaxe
                    case(271)://Wooden Axe
                    case(290)://Wooden Hoe
                        return this.botSocket.spawnChildren(payload, { litterSizeMultiplier: 10 });
                }
            break;
            //
            case('craft'):
                switch(payload.recipe){
                    case(5):
                    case('5:1'):
                    case('5:2'):
                    case('5:3'):
                    case('5:4'):
                    case('5:5'):
                    case(280):
                        return this.botSocket.spawnChildren(payload, {litterSizeMultiplier:10 });
                    case(58):
                    case(50):
                    case(268)://Wooden Sword
                    case(269)://Wooden Shovel
                    case(270)://Wooden Pickaxe
                    case(271)://Wooden Axe
                    case(290)://Wooden Hoe
                        return this.botSocket.spawnChildren(
                            payload,
                            {
                                litterSizeMultiplier: 100,
                                spawnPriority: 5000
                            });
                    //break;
                    default:
                        return this.botSocket.spawnChildren(payload, { /*litterSizeMultiplier: 10*/ });
                }
            case('place_block'):
            //case('place_block_attempt'):
                switch(payload.recipe){

                    case(58):
                    case(50):

                        return this.botSocket.spawnChildren(payload, {
                            litterSizeMultiplier: 100,
                            spawnPriority: 5100
                        });
                    case(3):
                    case('3:1'):
                        //DO nothing
                    break;
                    default:
                        return this.botSocket.spawnChildren(payload, { spawnPriority: 5050 });
                }
            //break;

        }
        return new Promise((resolve, reject)=>{
            return resolve();
        })
    }
    testFitnessOld(bot, payload:any) {
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