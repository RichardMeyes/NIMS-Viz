import { EventEmitter } from '@angular/core';
import { IClientSubscribeOptions } from './mqtt-types';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { IMqttClient, MqttConnectionState, IMqttMessage, IMqttServiceOptions, IOnConnectEvent, IOnErrorEvent, IOnMessageEvent, IOnSubackEvent, IPublishOptions } from './mqtt.model';
/**
 * With an instance of MqttService, you can observe and subscribe to MQTT in multiple places, e.g. in different components,
 * to only subscribe to the broker once per MQTT filter.
 * It also handles proper unsubscription from the broker, if the last observable with a filter is closed.
 */
export declare class MqttService {
    private options;
    private client;
    /** a map of all mqtt observables by filter */
    observables: {
        [filter: string]: Observable<IMqttMessage>;
    };
    /** the connection state */
    state: BehaviorSubject<MqttConnectionState>;
    /** an observable of the last mqtt message */
    messages: Subject<IMqttMessage>;
    private _clientId;
    private _keepalive;
    private _connectTimeout;
    private _reconnectPeriod;
    private _url;
    private _onConnect;
    private _onClose;
    private _onError;
    private _onReconnect;
    private _onMessage;
    private _onSuback;
    /**
     * The constructor needs [connection options]{@link IMqttServiceOptions} regarding the broker and some
     * options to configure behavior of this service, like if the connection to the broker
     * should be established on creation of this service or not.
     */
    constructor(options: IMqttServiceOptions, client?: IMqttClient);
    /**
     * connect manually connects to the mqtt broker.
     */
    connect(opts?: IMqttServiceOptions, client?: IMqttClient): void;
    /**
     * gets the _clientId
     */
    readonly clientId: string;
    /**
     * disconnect disconnects from the mqtt client.
     * This method `should` be executed when leaving the application.
     */
    disconnect(force?: boolean): void;
    /**
     * With this method, you can observe messages for a mqtt topic.
     * The observable will only emit messages matching the filter.
     * The first one subscribing to the resulting observable executes a mqtt subscribe.
     * The last one unsubscribing this filter executes a mqtt unsubscribe.
     * Every new subscriber gets the latest message.
     */
    observeRetained(filterString: string, opts?: IClientSubscribeOptions): Observable<IMqttMessage>;
    /**
     * With this method, you can observe messages for a mqtt topic.
     * The observable will only emit messages matching the filter.
     * The first one subscribing to the resulting observable executes a mqtt subscribe.
     * The last one unsubscribing this filter executes a mqtt unsubscribe.
     */
    observe(filterString: string, opts?: IClientSubscribeOptions): Observable<IMqttMessage>;
    /**
     * With this method, you can observe messages for a mqtt topic.
     * The observable will only emit messages matching the filter.
     * The first one subscribing to the resulting observable executes a mqtt subscribe.
     * The last one unsubscribing this filter executes a mqtt unsubscribe.
     * Depending on the publish function, the messages will either be replayed after new
     * subscribers subscribe or the messages are just passed through
     */
    private _generalObserve(filterString, publishFn, opts);
    /**
     * This method publishes a message for a topic with optional options.
     * The returned observable will emit empty value and complete, if publishing was successful
     * and will throw an error, if the publication fails.
     */
    publish(topic: string, message: any, options?: IPublishOptions): Observable<void>;
    /**
     * This method publishes a message for a topic with optional options.
     * If an error occurs, it will throw.
     */
    unsafePublish(topic: string, message: any, options?: IPublishOptions): void;
    /**
     * This static method shall be used to determine whether a MQTT
     * topic matches a given filter. The matching rules are specified in the MQTT
     * standard documentation and in the library test suite.
     *
     * @param  {string}  filter A filter may contain wildcards like '#' and '+'.
     * @param  {string}  topic  A topic may not contain wildcards.
     * @return {boolean}        true on match and false otherwise.
     */
    static filterMatchesTopic(filter: string, topic: string): boolean;
    /** An EventEmitter to listen to close messages */
    readonly onClose: EventEmitter<void>;
    /** An EventEmitter to listen to connect messages */
    readonly onConnect: EventEmitter<IOnConnectEvent>;
    /** An EventEmitter to listen to reconnect messages */
    readonly onReconnect: EventEmitter<void>;
    /** An EventEmitter to listen to message events */
    readonly onMessage: EventEmitter<IOnMessageEvent>;
    /** An EventEmitter to listen to suback events */
    readonly onSuback: EventEmitter<IOnSubackEvent>;
    /** An EventEmitter to listen to error events */
    readonly onError: EventEmitter<IOnErrorEvent>;
    private _handleOnClose;
    private _handleOnConnect;
    private _handleOnReconnect;
    private _handleOnError;
    private _handleOnMessage;
    private _generateClientId();
}
