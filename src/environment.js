"use strict";
import q from 'q';
import winston from 'winston';

const POLL_INTERVAL = 5; // In seconds
const STATUS_CHANGE_TIMEOUT = 1200; // In seconds
const HEALTHY_TIMEOUT = 120; // In seconds

class Environment {

    constructor(elasticbeanstalk) {
        this.elasticbeanstalk = elasticbeanstalk;
    }

    /**
     * @param {string} environmentName - e.g. tech-website-prod
     * @returns {Promise}
     */
    describeEnvironment(environmentName) {

        return q.ninvoke(
            this.elasticbeanstalk,
            'describeEnvironments',
            {
                EnvironmentNames: [environmentName],
                IncludeDeleted: false
            }
        ).then(data => data.Environments.shift());
    }

    status() {
        return this.describeEnvironment.apply(this, arguments).then(e => e ? e.Status : null);
    }

    /**
     * @param {string} applicationName
     * @param {string} environmentName
     * @param {string} versionLabel
     * @param {object} stack
     * @param {object} config
     * @returns {*}
     */
    create(applicationName, environmentName, versionLabel, stack, config) {
        return q.async(function* () {

            const availability = yield this.checkDNSAvailability(environmentName);
            if (!availability) {
                throw (`DNS ${environmentName} is not available`);
            }

            return q.ninvoke(
                this.elasticbeanstalk,
                'createEnvironment',
                {
                    ApplicationName: applicationName,
                    VersionLabel: versionLabel,
                    EnvironmentName: environmentName,
                    SolutionStackName: stack,
                    OptionSettings: config,
                    CNAMEPrefix: environmentName
                }
            );


        }.bind(this))();
    }

    deploy(versionLabel, environmentName, config) {
        return q.ninvoke(
            this.elasticbeanstalk,
            'updateEnvironment',
            {
                VersionLabel: versionLabel,
                EnvironmentName: environmentName,
                OptionSettings: config
            }
        );
    }

    waitUntilStatusIsNot(oldStatus, environmentName) {

        winston.info(`Waiting for ${environmentName} to finish ${oldStatus.toLowerCase()}`);

        return q.async(function* () {

            let timeLeft = STATUS_CHANGE_TIMEOUT;
            let status = yield this.status(environmentName);

            while (timeLeft > 0 && status === oldStatus) {
                process.stdout.write('.');
                status = yield this.status(environmentName);
                timeLeft = timeLeft - POLL_INTERVAL;
                yield this.wait(POLL_INTERVAL);
            }
            process.stdout.write('\n');
            return status;

        }.bind(this))();
    }

    waitUtilHealthy(environmentName) {

        winston.info(`Waiting until ${environmentName} is healthy`);

        return q.async(function* () {

            let timeLeft = HEALTHY_TIMEOUT;
            let environmentDescription = {};

            while (timeLeft > 0 && environmentDescription.Health !== 'Green') {
                process.stdout.write('.');
                environmentDescription = yield this.describeEnvironment(environmentName);
                timeLeft = timeLeft - POLL_INTERVAL;
                yield this.wait(POLL_INTERVAL);
            }

            if (environmentDescription.Health !== 'Green') {
                throw new Error(`${environmentName} is not healthy`);
            }
            process.stdout.write('\n');
            return environmentDescription;

        }.bind(this))();
    }

    wait(seconds) {
        const defer = q.defer();
        setTimeout(() => defer.resolve(true), seconds * 1000);
        return defer.promise;
    }

    checkDNSAvailability(environmentName) {
        winston.info(`Check ${environmentName} availability`);
        return q.ninvoke(
            this.elasticbeanstalk,
            'checkDNSAvailability',
            {
                CNAMEPrefix: environmentName
            }
        ).then(data => data.Available);
    }

    terminate(environmentName) {

        winston.info(`Terminating Environment named ${environmentName}...`);

        return q.ninvoke(
            this.elasticbeanstalk,
            'terminateEnvironment',
            {
                EnvironmentName: environmentName
            }
        );

    }
}

export default Environment;
