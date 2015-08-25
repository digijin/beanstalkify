[AWS Elastic Beanstalk](http://aws.amazon.com/elasticbeanstalk/) automation. A work in progress.
This is the node version of [Ruby Beanstalkify](https://github.com/pranavraja/beanstalkify/) 

[![Build Status](https://travis-ci.org/liamqma/beanstalkify.svg?branch=master)](https://travis-ci.org/liamqma/beanstalkify)

## Install
```bash
    npm install beanstalkify --save
```

## Usage

```javascript
var Application = require('beanstalk');
var application = new Application(
    {
        accessKeyId: 'XXX',
        secretAccessKey: 'XXX',
        region: 'ap-southeast-2'
    },
    'PATH TO ZIP FILE',
    'ENVIRONMENT NAME',
    'CNAME',
    [
        Beanstalk options
        ....
    ],
    'OUTPUT JSON FILE'
);

application.deploy();
```

## Test

```bash
npm test
```