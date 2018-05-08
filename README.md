# ChaosCraft Server:
This manages the brains behind the [ChaosCraft Bots](http://github.com/schematical/chaoscraft).
If your not familiar with ChaosCraft check us out on [YouTube](https://www.youtube.com/playlist?list=PLLkpLgU9B5xJ7Qy4kOyBJl5J6zsDIMceH)

## Note:
At the moment you can install [ChaosCraft Bot](http://github.com/schematical/chaoscraft) and run it locally or on a server of your
own with out needing to install the ChaosCraft Server. They automatically point at our servers.
Understand that the ChaosCraft Server is NOT the same as running a MineCraft server. Feel free to run your own MineCraft Server as well.

## Install:

### Step 1:
Install Git
https://git-scm.com/downloads


### Step 2:
Install NodeJS
https://nodejs.org/en/

### Step 3:
Clone down the code from GitHub
```
git clone git@github.com:schematical/chaoscraft-server.git
```

### Step 4:
Run `npm install`

### Step 5:
Build it
```
npm build
```

### Step 7:
Set your  [ChaosCraft Bots](http://github.com/schematical/chaoscraft) config to point at your sever implementation.
The full scope of how to do this is a bit much but if you know how to setup web servers you should be able to figure it out.


Setup your configurations, you will need to setup your own MongoDB setup and Redis.
We are using the [npm `config` package](https://www.npmjs.com/package/config).
You can see my information in the [./config](./config) directory.
The format is as follows:
#### Redis:

```
    ...
    redis:{
        chaoscraft: {
            port: 6379,
            host:  'YOUR_REDIS_HOST',
            prefix: 'chaoscraft:'
        }
    },
    ...
```

#### Mongo:
```
    ...
    mongo:{
        chaoscraft: {
            url: 'mongodb://YOUR_MONGO_URI',
            user: 'YOUR_USERNAME',
            pass: 'YOUR_PASSWORD'
        }

    },
    ...

```

### Step 8:
Start it
```
npm start
```

### Step 9:


## API:
NOTE: This is not complete and moves quickly. Just look in the [./routes](./routes) directory.

### `GET /bots`:
List off bots that are marked as `alive`

### `GET /bots/:bot`:
Gives you details on a specific bot

### `GET /bots/:bot/brain`:
Returns the bots Neural Network

### `GET /bots/active`:
Returns a list of bots that are currently active(online).

### `GET /bots/:bot/active`:
Lets you know if a specific bot is online.

### `GET /bots/:bot/inventory`
Returns information on a specific bots inventory

### `GET /bots/:bot/position`
Returns information on a specific bots position

### `GET /bots/:bot/stats`
Returns information on a specific bots stats

### `GET /stats`
Returns leaderboard information
