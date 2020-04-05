'use strict';

const EventEmitter = require('events');
const TimeMatcher = require('./time-matcher');

const resolution = {
    SECONDS: 1000,
    TENTHS: 100
};

class Scheduler extends EventEmitter {
    constructor({ pattern, timezone, autorecover, datetime }) {
        super();
        if (pattern !== undefined) {
            this.timeMatcher = new TimeMatcher(pattern, timezone);
        }
        this.autorecover = autorecover;
        this.datetime = datetime;
        if (pattern !== undefined) {
            this.resolution = resolution.SECONDS;
        } else {
            // todo check for datetime and error if it's missing too
            this.resolution = resolution.TENTHS;
        }
    }

    start() {
        // clear timeout if exists
        this.stop();

        let lastCheck = process.hrtime();
        let lastExecution = new Date();

        var matchTime = () => {
            const delay = this.resolution;
            const elapsedTime = process.hrtime(lastCheck);
            const elapsedMs = (elapsedTime[0] * 1e9 + elapsedTime[1]) / 1e6;
            const missedExecutions = Math.floor(elapsedMs / this.resolution);

            for (let i = missedExecutions; i >= 0; i--) {
                var date = new Date(new Date().getTime() - i * this.resolution);
                if (lastExecution.getTime() < date.getTime() && (i === 0 || this.autorecover) && this.matcher(date, lastExecution)) {
                    this.emit('scheduled-time-matched', date);
                    // adjust date to resolution
                    if (this.resolution === resolution.SECONDS) {
                        date.setMilliseconds(0);
                    } else {
                        date = new Date(date.getTime - (date.getMilliseconds() / 10));
                    }
                    lastExecution = date;
                }
            }
            lastCheck = process.hrtime();
            this.timeout = setTimeout(matchTime, delay);
        };
        matchTime();
    }

    stop() {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.timeout = null;
    }

    matcher(date, last) {
        if (this.resolution === resolution.SECONDS) {
            return this.timeMatcher.match(date);
        } else {
            return this.datetime <= date && this.datetime > last ;
        }
    }
}



module.exports = Scheduler;
