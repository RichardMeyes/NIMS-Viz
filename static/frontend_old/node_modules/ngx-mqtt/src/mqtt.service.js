import { EventEmitter, Inject, Injectable } from '@angular/core';
import { connect } from '../vendor/mqtt.browserified.js';
import * as extend from 'xtend';
import { BehaviorSubject, merge, Observable, Subscription, Subject, using } from 'rxjs';
import { filter, publish, publishReplay, refCount } from 'rxjs/operators';
import { MqttConnectionState } from './mqtt.model';
import { MqttServiceConfig, MqttClientService } from './index';
import * as i0 from "@angular/core";
import * as i1 from "./mqtt.module";
import * as i2 from "./index";
/**
 * With an instance of MqttService, you can observe and subscribe to MQTT in multiple places, e.g. in different components,
 * to only subscribe to the broker once per MQTT filter.
 * It also handles proper unsubscription from the broker, if the last observable with a filter is closed.
 */
var MqttService = /** @class */ (function () {
    /**
     * The constructor needs [connection options]{@link IMqttServiceOptions} regarding the broker and some
     * options to configure behavior of this service, like if the connection to the broker
     * should be established on creation of this service or not.
     */
    function MqttService(options, client) {
        var _this = this;
        this.options = options;
        this.client = client;
        /** a map of all mqtt observables by filter */
        this.observables = {};
        /** the connection state */
        this.state = new BehaviorSubject(MqttConnectionState.CLOSED);
        /** an observable of the last mqtt message */
        this.messages = new Subject();
        this._clientId = this._generateClientId();
        this._keepalive = 10;
        this._connectTimeout = 10000;
        this._reconnectPeriod = 10000;
        this._url = undefined;
        this._onConnect = new EventEmitter();
        this._onClose = new EventEmitter();
        this._onError = new EventEmitter();
        this._onReconnect = new EventEmitter();
        this._onMessage = new EventEmitter();
        this._onSuback = new EventEmitter();
        this._handleOnClose = function () {
            _this.state.next(MqttConnectionState.CLOSED);
            _this._onClose.emit();
        };
        this._handleOnConnect = function (e) {
            Object.keys(_this.observables).forEach(function (filter) {
                _this.client.subscribe(filter);
            });
            _this.state.next(MqttConnectionState.CONNECTED);
            _this._onConnect.emit(e);
        };
        this._handleOnReconnect = function () {
            Object.keys(_this.observables).forEach(function (filter) {
                _this.client.subscribe(filter);
            });
            _this.state.next(MqttConnectionState.CONNECTING);
            _this._onReconnect.emit();
        };
        this._handleOnError = function (e) {
            _this._onError.emit(e);
            console.error(e);
        };
        this._handleOnMessage = function (topic, msg, packet) {
            _this._onMessage.emit(packet);
            if (packet.cmd === 'publish') {
                _this.messages.next(packet);
            }
        };
        if (options.connectOnCreate !== false) {
            this.connect({}, client);
        }
        this.state.subscribe();
    }
    /**
     * connect manually connects to the mqtt broker.
     */
    MqttService.prototype.connect = function (opts, client) {
        var options = extend(this.options || {}, opts);
        var protocol = options.protocol || 'ws';
        var hostname = options.hostname || 'localhost';
        var port = options.port || 1884;
        var path = options.path || '/';
        this._url = protocol + "://" + hostname + ":" + port + "/" + path;
        this.state.next(MqttConnectionState.CONNECTING);
        var mergedOptions = extend({
            clientId: this._clientId,
            keepalive: this._keepalive,
            reconnectPeriod: this._reconnectPeriod,
            connectTimeout: this._connectTimeout
        }, options);
        if (this.client) {
            this.client.end(true);
        }
        if (!client) {
            this.client = connect(this._url, mergedOptions);
        }
        else {
            this.client = client;
        }
        this._clientId = mergedOptions.clientId;
        this.client.on('connect', this._handleOnConnect);
        this.client.on('close', this._handleOnClose);
        this.client.on('error', this._handleOnError);
        this.client.stream.on('error', this._handleOnError);
        this.client.on('reconnect', this._handleOnReconnect);
        this.client.on('message', this._handleOnMessage);
    };
    Object.defineProperty(MqttService.prototype, "clientId", {
        /**
         * gets the _clientId
         */
        get: function () {
            return this._clientId;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * disconnect disconnects from the mqtt client.
     * This method `should` be executed when leaving the application.
     */
    MqttService.prototype.disconnect = function (force) {
        if (force === void 0) { force = true; }
        if (!this.client) {
            throw new Error('mqtt client not connected');
        }
        this.client.end(force);
    };
    /**
     * With this method, you can observe messages for a mqtt topic.
     * The observable will only emit messages matching the filter.
     * The first one subscribing to the resulting observable executes a mqtt subscribe.
     * The last one unsubscribing this filter executes a mqtt unsubscribe.
     * Every new subscriber gets the latest message.
     */
    MqttService.prototype.observeRetained = function (filterString, opts) {
        if (opts === void 0) { opts = { qos: 1 }; }
        return this._generalObserve(filterString, function () { return publishReplay(1); }, opts);
    };
    /**
     * With this method, you can observe messages for a mqtt topic.
     * The observable will only emit messages matching the filter.
     * The first one subscribing to the resulting observable executes a mqtt subscribe.
     * The last one unsubscribing this filter executes a mqtt unsubscribe.
     */
    MqttService.prototype.observe = function (filterString, opts) {
        if (opts === void 0) { opts = { qos: 1 }; }
        return this._generalObserve(filterString, function () { return publish(); }, opts);
    };
    /**
     * With this method, you can observe messages for a mqtt topic.
     * The observable will only emit messages matching the filter.
     * The first one subscribing to the resulting observable executes a mqtt subscribe.
     * The last one unsubscribing this filter executes a mqtt unsubscribe.
     * Depending on the publish function, the messages will either be replayed after new
     * subscribers subscribe or the messages are just passed through
     */
    MqttService.prototype._generalObserve = function (filterString, publishFn, opts) {
        var _this = this;
        if (!this.client) {
            throw new Error('mqtt client not connected');
        }
        if (!this.observables[filterString]) {
            var rejected_1 = new Subject();
            this.observables[filterString] = using(
            // resourceFactory: Do the actual ref-counting MQTT subscription.
            // refcount is decreased on unsubscribe.
            function () {
                var subscription = new Subscription();
                _this.client.subscribe(filterString, opts, function (err, granted) {
                    if (granted) {
                        granted.forEach(function (granted_) {
                            if (granted_.qos === 128) {
                                delete _this.observables[granted_.topic];
                                _this.client.unsubscribe(granted_.topic);
                                rejected_1.error("subscription for '" + granted_.topic + "' rejected!");
                            }
                            _this._onSuback.emit({ filter: filterString, granted: granted_.qos !== 128 });
                        });
                    }
                });
                subscription.add(function () {
                    delete _this.observables[filterString];
                    _this.client.unsubscribe(filterString);
                });
                return subscription;
            }, 
            // observableFactory: Create the observable that is consumed from.
            // This part is not executed until the Observable returned by
            // `observe` gets actually subscribed.
            function (subscription) { return merge(rejected_1, _this.messages); })
                .pipe(filter(function (msg) { return MqttService.filterMatchesTopic(filterString, msg.topic); }), publishFn(), refCount());
        }
        return this.observables[filterString];
    };
    /**
     * This method publishes a message for a topic with optional options.
     * The returned observable will emit empty value and complete, if publishing was successful
     * and will throw an error, if the publication fails.
     */
    MqttService.prototype.publish = function (topic, message, options) {
        var _this = this;
        if (!this.client) {
            throw new Error('mqtt client not connected');
        }
        var source = Observable.create(function (obs) {
            _this.client.publish(topic, message, options, function (err) {
                if (err) {
                    obs.error(err);
                }
                else {
                    obs.next(null);
                    obs.complete();
                }
            });
        });
        return source;
    };
    /**
     * This method publishes a message for a topic with optional options.
     * If an error occurs, it will throw.
     */
    MqttService.prototype.unsafePublish = function (topic, message, options) {
        if (!this.client) {
            throw new Error('mqtt client not connected');
        }
        this.client.publish(topic, message, options, function (err) {
            if (err) {
                throw (err);
            }
        });
    };
    /**
     * This static method shall be used to determine whether a MQTT
     * topic matches a given filter. The matching rules are specified in the MQTT
     * standard documentation and in the library test suite.
     *
     * @param  {string}  filter A filter may contain wildcards like '#' and '+'.
     * @param  {string}  topic  A topic may not contain wildcards.
     * @return {boolean}        true on match and false otherwise.
     */
    MqttService.filterMatchesTopic = function (filter, topic) {
        if (filter[0] === '#' && topic[0] === '$') {
            return false;
        }
        // Preparation: split and reverse on '/'. The JavaScript split function is sane.
        var fs = (filter || '').split('/').reverse();
        var ts = (topic || '').split('/').reverse();
        // This function is tail recursive and compares both arrays one element at a time.
        var match = function () {
            // Cutting of the last element of both the filter and the topic using pop().
            var f = fs.pop();
            var t = ts.pop();
            switch (f) {
                // In case the filter level is '#', this is a match no matter whether
                // the topic is undefined on this level or not ('#' matches parent element as well!).
                case '#': return true;
                // In case the filter level is '+', we shall dive into the recursion only if t is not undefined.
                case '+': return t ? match() : false;
                // In all other cases the filter level must match the topic level,
                // both must be defined and the filter tail must match the topic
                // tail (which is determined by the recursive call of match()).
                default: return f === t && (f === undefined ? true : match());
            }
        };
        return match();
    };
    Object.defineProperty(MqttService.prototype, "onClose", {
        /** An EventEmitter to listen to close messages */
        get: function () {
            return this._onClose;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MqttService.prototype, "onConnect", {
        /** An EventEmitter to listen to connect messages */
        get: function () {
            return this._onConnect;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MqttService.prototype, "onReconnect", {
        /** An EventEmitter to listen to reconnect messages */
        get: function () {
            return this._onReconnect;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MqttService.prototype, "onMessage", {
        /** An EventEmitter to listen to message events */
        get: function () {
            return this._onMessage;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MqttService.prototype, "onSuback", {
        /** An EventEmitter to listen to suback events */
        get: function () {
            return this._onSuback;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MqttService.prototype, "onError", {
        /** An EventEmitter to listen to error events */
        get: function () {
            return this._onError;
        },
        enumerable: true,
        configurable: true
    });
    MqttService.prototype._generateClientId = function () {
        return 'client-' + Math.random().toString(36).substr(2, 19);
    };
    MqttService.decorators = [
        { type: Injectable, args: [{
                    providedIn: 'root',
                },] },
    ];
    /** @nocollapse */
    MqttService.ctorParameters = function () { return [
        { type: undefined, decorators: [{ type: Inject, args: [MqttServiceConfig,] }] },
        { type: undefined, decorators: [{ type: Inject, args: [MqttClientService,] }] }
    ]; };
    MqttService.ngInjectableDef = i0.defineInjectable({ factory: function MqttService_Factory() { return new i1.MqttService(i0.inject(i2.MqttServiceConfig), i0.inject(i2.MqttClientService)); }, token: i1.MqttService, providedIn: "root" });
    return MqttService;
}());
export { MqttService };
//# sourceMappingURL=mqtt.service.js.map