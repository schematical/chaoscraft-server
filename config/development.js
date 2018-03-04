const path = require('path');
module.exports = {
    search:{
        result_cache_duration:1,
        display_debug: true
    },
    cache_dir: path.resolve(__dirname, '..', '_cache'),
    aws:{
        region:'us-east-1',
        sqs:{
            queues:{
                crawler: {
                    url:'https://sqs.us-east-1.amazonaws.com/368590945923/castdex-dev'
                },


            }

        },
        s3:{
            buckets:{
               // media:'castdex-prod-media'
            }
        }
    },
    redis:{
        chaoscraft: {
            port: 6379,
            host: 'localhost',
            prefix: 'chaoscraft:'
        }

    },
};