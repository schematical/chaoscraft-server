module.exports = {
    port: 80,
    brain:{
        length: 10,
        inputNodePool:60,
        maxChainLength: 4,
        maxDependants: 2,
        minDependants: 2,
        maxTargets: 10,
        passOnDecay: .2,//The amount of nodes to lose
        passOnAdd: .4,//The percentage of nodes to add on
        max_litter_size: 6,
        spawn_children_pong_ct: 10//4x a day
    },
    minecraft:{
        version:'1.12.2'
    },
    redis:{
        chaoscraft: {
            port: 6379,
            host:  'slack-tools.bdzyjf.0001.use1.cache.amazonaws.com',
            prefix: 'chaoscraft:'
        }
    },
    mongo:{
        chaoscraft: {
            url: 'mongodb://ds117104-a0.mlab.com:17104,ds117104-a1.mlab.com:17104/castdex-prod?replicaSet=rs-ds117104',
            user: 'castdex-application',
            pass: process.env.MONGO_PASSWORD
        }

    },
    aws:{
        region:'us-east-1',
        sqs:{
            queues: {
                chaoscraft: {
                    url: 'https://sqs.us-east-1.amazonaws.com/368590945923/castdex-prod'
                },

            }
        },
        s3:{
            buckets:{
                //media:'chaoscraft'
            }
        }
    },
    session:{
        secret:'920mIUf[w!!*#id'
    },
    google:{
        clientId:'331751192796-avnl2q3iueue79k8h62mde4m8qtgf029.apps.googleusercontent.com',
        clientSecret:'sshLFp-1HU25xT1TUe4Uazoh',
        redirectUrl:'https://www.castex.com/auth/google'
    },
    auth:{
        jwt_secret:'(iHp&^mU!7#lll'
    }
}