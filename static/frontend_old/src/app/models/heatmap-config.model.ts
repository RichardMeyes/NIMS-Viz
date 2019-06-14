export class HeatmapConfig {
    radius;
    blur;
    density;
    minOpacity;
    weightValueMin;
    weightValueMax;
    color1;
    color1Trigger;
    color2;
    color2Trigger;
    color3;
    color3Trigger;
    colorGradient;

    constructor() {
        this.radius = 2;
        this.blur = 8;
        this.density = 5;
        this.minOpacity = 0.05;
        this.weightValueMin = -10;
        this.weightValueMax = 10;
        this.color1 = '#0000ff';
        this.color1Trigger = 0.0;
        this.color2 = '#ffffff';
        this.color2Trigger = 0.5;
        this.color3 = '#ff0000';
        this.color3Trigger = 1.0;
        this.colorGradient = function () {
            const tempobj = {};
            const diff = Math.abs(this.weightValueMax - this.weightValueMin);
            const col1TriggerInPerc = parseFloat((Math.abs(this.color1Trigger - this.weightValueMin) / diff).toFixed(2));
            const col2TriggerInPerc = parseFloat((Math.abs(this.color2Trigger - this.weightValueMin) / diff).toFixed(2));
            const col3TriggerInPerc = parseFloat((Math.abs(this.color3Trigger - this.weightValueMin) / diff).toFixed(2));
            tempobj[col1TriggerInPerc] = this.color1;
            tempobj[col2TriggerInPerc] = this.color2;
            tempobj[col3TriggerInPerc] = this.color3;
            return tempobj;
        };
    }
}
