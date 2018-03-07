module.exports = {
    port: process.env.PORT || 80,
    redis:{
        chaoscraft: {
            port: 6379,
            host:  'slack-tools.bdzyjf.0001.use1.cache.amazonaws.com',
            prefix: 'chaoscraftx:'
        }
    },
    mongo:{
        chaoscraft: {
            url: 'mongodb://ds117104-a0.mlab.com:17104,ds117104-a1.mlab.com:17104/castdex-prod?replicaSet=rs-ds117104',
            user: 'castdex-application',
            pass: process.env.MONGO_PASSWORD || 'Jm21Gxu5v1'
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