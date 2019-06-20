import { NgModule, InjectionToken } from '@angular/core';
export * from './mqtt.service';
export * from './mqtt.model';
export var MQTT_SERVICE_OPTIONS = {
    connectOnCreate: true,
    hostname: 'localhost',
    port: 1884,
    path: ''
};
export var MqttServiceConfig = new InjectionToken('NgxMqttServiceConfig');
export var MqttClientService = new InjectionToken('NgxMqttClientService');
var MqttModule = /** @class */ (function () {
    function MqttModule() {
    }
    MqttModule.forRoot = function (config, client) {
        return {
            ngModule: MqttModule,
            providers: [
                {
                    provide: MqttServiceConfig,
                    useValue: config
                },
                {
                    provide: MqttClientService,
                    useValue: client
                }
            ]
        };
    };
    MqttModule.decorators = [
        { type: NgModule },
    ];
    return MqttModule;
}());
export { MqttModule };
//# sourceMappingURL=mqtt.module.js.map