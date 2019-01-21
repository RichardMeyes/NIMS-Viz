import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';

import { debounceTime, takeUntil, take } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { PlaygroundService } from '../playground.service';
import { NetworkService } from '../network.service';

import { Playground } from '../playground.model';
import { DataService } from '../services/data.service';
import { MatTabChangeEvent } from '@angular/material';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit, AfterViewInit, OnDestroy {
  activeTab: number;

  playgroundForm: FormGroup;
  playgroundData: Playground;

  files; selectedFile;
  epochSliderConfig;

  heatmapNormalConfig;
  drawFully;

  destroyed = new Subject<void>();

  constructor(
    public router: Router,
    private fb: FormBuilder,
    private playgroundService: PlaygroundService,
    private networkService: NetworkService,
    private dataService: DataService
  ) { }

  get layers(): FormArray {
    return this.playgroundForm.get('layers') as FormArray;
  }

  ngOnInit() {
    this.activeTab = 0;

    this.playgroundData = new Playground();
    this.heatmapNormalConfig = new HeatmapConfig();

    this.dataService.epochSliderConfig
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { this.epochSliderConfig = val; });

    this.drawFully = false;

    if (this.router.url.includes('builder')) {
      this.createForm();
    } else {
      this.scanForFiles();
    }
  }

  ngAfterViewInit() { }

  createForm() {
    this.playgroundForm = this.fb.group({
      batch_size_train: [0, [Validators.required, Validators.min(0)]],
      batch_size_test: [0, [Validators.required, Validators.min(0)]],
      num_epochs: [0, [Validators.required, Validators.min(0)]],

      learning_rate: ['', Validators.required],
      layerCount: [0, [Validators.required, Validators.min(0)]],

      layers: this.fb.array([])
    });

    this.playgroundForm.patchValue({
      batch_size_train: this.playgroundData.batchSize,
      batch_size_test: this.playgroundData.batchSize,
      num_epochs: this.playgroundData.epoch,

      learning_rate: this.playgroundData.learningRates[0].value,
      layerCount: this.playgroundData.layerCount
    });

    this.playgroundForm.setControl('layers', this.fb.array(
      this.playgroundService.arrayOne(this.playgroundData.layerCount).map(layer => this.fb.group({
        unitCount: [1, [Validators.required, Validators.min(1)]]
      }))
    ));

    this.resetForm();
    this.layerCountChange();
  }

  resetForm() {
    for (let i = 0; i < this.playgroundData.layerCount; i++) {
      const currLayer = this.playgroundData.mnistLayers[i];

      this.layers.controls[i].setValue({
        unitCount: currLayer.unitCount
      });
    }
  }

  layerCountChange() {
    const layerCountControl = this.playgroundForm.get('layerCount');
    layerCountControl.valueChanges.pipe(debounceTime(500)).forEach(
      () => {
        if (+this.playgroundForm.get('layerCount').value > this.layers.controls.length) {
          for (let i = this.layers.controls.length; i < +this.playgroundForm.get('layerCount').value; i++) {
            this.layers.push(this.fb.group({
              unitCount: [1, [Validators.required, Validators.min(1)]]
            }));
          }
        } else {
          for (let i = this.layers.controls.length; i > +this.playgroundForm.get('layerCount').value; i--) {
            this.layers.removeAt(i - 1);
          }
        }
      }
    );
  }

  delLayer(i: number) {
    this.layers.removeAt(i);
    this.playgroundForm.get('layerCount').setValue(this.layers.length);
  }

  trainNetwork() {
    const captureForm: any = JSON.parse(JSON.stringify(this.playgroundForm.value));
    const objToSend = {
      learning_rate: +captureForm.learning_rate,
      batch_size_train: +captureForm.batch_size_train,
      batch_size_test: +captureForm.batch_size_test,
      num_epochs: +captureForm.num_epochs,
      layers: []
    };

    captureForm.layers.forEach(layer => {
      objToSend.layers.push(layer.unitCount);
    });

    this.dataService.vizTopology.next(this.playgroundForm.value);
    this.dataService.vizWeights.next(null);
    this.networkService.send('mlp', JSON.parse(JSON.stringify(objToSend)));
  }

  reset() {
    this.playgroundForm.patchValue({
      batch_size_train: this.playgroundData.batchSize,
      batch_size_test: this.playgroundData.batchSize,
      num_epochs: this.playgroundData.epoch,

      learning_rate: this.playgroundData.learningRates[0].value,
      layerCount: this.playgroundData.layerCount
    });

    while (this.layers.length !== 0) { this.layers.removeAt(0); }
    for (let index = 0; index < this.playgroundForm.get('layerCount').value; index++) {
      this.layers.push(this.fb.group({
        unitCount: [1, [Validators.required, Validators.min(1)]]
      }));
    }
    this.resetForm();
  }

  scanForFiles(isNewlyCreated?: boolean) {
    this.networkService.detectFiles()
      .pipe(takeUntil(this.destroyed))
      .subscribe(
        data => {
          const newFileList = [];
          for (const element of data['result']) {
            newFileList.push({
              value: element['pathName'],
              viewValue: element['fileName'],
              epochRange: element['epochMinMax'],
              weightMinMax: element['weightMinMax']
            });
          }
          if (isNewlyCreated) {
            let newFileValue = '';
            for (const currFile of newFileList) {
              // check which file from the new filelist is not found in the old filelist
              const isFound = this.files.find(element => element.value === currFile.value);
              if (typeof (isFound) === 'undefined') {
                newFileValue = currFile.value;
                break;
              } else {
                newFileValue = this.selectedFile;
              }
            }
            this.files = newFileList;
            this.selectedFileClick(this.files.find(element => element.value === newFileValue).value);
          } else {
            this.files = newFileList;
            this.selectedFileClick(this.files[0].value);
          }
        }
      );
  }

  selectedFileClick(filePath) {
    this.selectedFile = filePath;
  }

  visualize() {
    this.dataService.vizWeights.next(null);

    const nextEpochConfig = new EpochConfig();
    nextEpochConfig.epochRange = this.files.find(element => element.value === this.selectedFile).epochRange;
    this.dataService.epochSliderConfig.next(nextEpochConfig);

    this.heatmapNormalConfig.weightValueMin = this.files.find(element => element.value === this.selectedFile).weightMinMax[0];
    this.heatmapNormalConfig.weightValueMax = this.files.find(element => element.value === this.selectedFile).weightMinMax[1];

    for (let i = nextEpochConfig.epochRange[0]; i <= nextEpochConfig.epochRange[1]; i++) {
      let newNodeStruct = false;
      if (i === 0) { newNodeStruct = true; }

      this.networkService.createHeatmapFromFile(
        this.selectedFile,
        i,
        [this.heatmapNormalConfig.weightValueMin, this.heatmapNormalConfig.weightValueMax],
        this.drawFully,
        newNodeStruct,
        this.heatmapNormalConfig.density,
        undefined
      )
        .pipe(take(1))
        .subscribe(data => {
          const param = {
            data: data,
            heatmapNormalConfig: this.heatmapNormalConfig
          };
          setTimeout(() => {
            this.dataService.createHeatmap.next(param);
          }, i * 1000);
        });


      this.playgroundService.visualize(this.selectedFile, i)
        .pipe(take(1))
        .subscribe(val => {
          let layers: any[] = this.selectedFile.substring(this.selectedFile.indexOf('[') + 1, this.selectedFile.indexOf(']'))
            .replace(/\s/g, '')
            .split(',')
            .map(layer => +layer);
          const currEpoch = `epoch_${i}`;

          layers = layers.map(unitCount => { return { 'unitCount': unitCount }; });

          setTimeout(() => {
            this.dataService.vizTopology.next({ 'layers': layers });
            if (val) { this.dataService.vizWeights.next({ [currEpoch]: val }); }
          }, i * 1000);
        });

      setTimeout(() => {
        this.dataService.currEpoch.next(`Epoch ${i + 1}`);
      }, i * 1000);
    }
  }

  tabChanged(tabChangeEvent: MatTabChangeEvent) {
    this.activeTab = tabChangeEvent.index;
  }

  resetOptions() {
    this.heatmapNormalConfig = new HeatmapConfig();
    this.drawFully = false;
  }





  refreshHeatmap() {
    console.log(this.heatmapNormalConfig);
  }





  ngOnDestroy() {
    this.destroyed.next();
  }
}

class HeatmapConfig {
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
    }
  }
}

class EpochConfig {
  epochRange;
  epochValue;
  epochSelectedRange;

  constructor() {
    this.epochRange = [0, 1];
    this.epochValue = 0;
    this.epochSelectedRange = [0, 1];
  }
}
