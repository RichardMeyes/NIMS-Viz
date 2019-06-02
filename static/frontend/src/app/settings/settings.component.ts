import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { MatTabChangeEvent } from '@angular/material';

import { takeUntil, take, concatMap } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { PlaygroundService } from '../playground.service';
import { NetworkService } from '../network.service';
import { DataService } from '../services/data.service';

import { Playground, ConvLayer } from '../models/playground.model';
import { HeatmapConfig } from '../models/heatmap-config.model';
import { EpochConfig } from '../models/epoch-config.model';
import { Option } from '../models/option.model';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit, AfterViewInit, OnDestroy {
  activeSceneTab: number;
  activeSettingsTab: number;

  playgroundForm: FormGroup;
  playgroundData: Playground;

  firstChannel; lastChannel;
  commonChannels;

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

  get convLayers(): FormArray {
    return this.playgroundForm.get('convLayers') as FormArray;
  }
  get fcLayers(): FormArray {
    return this.playgroundForm.get('fcLayers') as FormArray;
  }

  ngOnInit() {
    this.activeSettingsTab = 0;

    const currOption = this.dataService.optionData.getValue();
    this.epochSliderConfig = currOption.epochSliderConfig;
    this.heatmapNormalConfig = currOption.heatmapNormalConfig;
    this.drawFully = currOption.drawFully;

    this.dataService.activeSceneTab
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { this.activeSceneTab = val; });

    if (this.router.url.includes('builder')) {
      this.dataService.playgroundData
        .pipe(takeUntil(this.destroyed))
        .subscribe(val => {
          this.playgroundData = val;
          this.createForm();
        });
    } else if (this.router.url.includes('archive') || this.router.url.includes('ablation')) {
      this.scanForFiles();
    }
  }

  ngAfterViewInit() { }

  createForm() {
    this.playgroundForm = this.fb.group({
      source: ['', Validators.required],

      batchSizeTrain: [0, [Validators.required, Validators.min(0)]],
      batchSizeTest: [0, [Validators.required, Validators.min(0)]],
      epoch: [0, [Validators.required, Validators.min(0)]],
      learning_rate: ['', Validators.required],

      convLayers: this.fb.array([]),
      fcLayers: this.fb.array([])
    });

    this.playgroundForm.patchValue({
      source: this.playgroundData.sources[this.playgroundData.selectedSource].value,

      batchSizeTrain: this.playgroundData.batchSizeTrain,
      batchSizeTest: this.playgroundData.batchSizeTest,
      epoch: this.playgroundData.epoch,
      learning_rate: this.playgroundData.learningRates[this.playgroundData.selectedLearningRates].value
    });


    this.firstChannel = this.playgroundData.firstChannel;
    this.lastChannel = this.playgroundData.lastChannel;
    this.commonChannels = this.playgroundData.commonChannels;

    this.playgroundForm.setControl('convLayers', this.fb.array(
      this.playgroundData.convLayers.map((layer: ConvLayer) => {
        return this.fb.group({
          kernelSize: [layer.kernelSize, [Validators.required, Validators.min(1)]],
          stride: [layer.stride, [Validators.required, Validators.min(1)]],
          padding: [layer.padding, [Validators.required, Validators.min(0)]]
        });
      })
    ));
    this.playgroundForm.setControl('fcLayers', this.fb.array(
      this.playgroundData.fcLayers.map(layer => this.fb.group({
        unitCount: [layer, [Validators.required, Validators.min(1)]]
      }))
    ));
  }

  delLayer(layerIndex: number, layer: string) {
    if (layer === 'convLayer') {
      if (layerIndex === 0) {
        this.firstChannel = this.commonChannels.shift();
      } else if (layerIndex === this.convLayers.length - 1) {
        this.lastChannel = this.commonChannels.pop();
      } else {
        this.commonChannels.splice(layerIndex, 1);
      }

      this.convLayers.removeAt(layerIndex);
    }

    if (layer === 'fcLayer') {
      this.fcLayers.removeAt(layerIndex);
    }
  }

  addLayer(layer: string) {
    if (layer === 'convLayer') {
      this.convLayers.push(this.fb.group({
        kernelSize: [5, [Validators.required, Validators.min(1)]],
        stride: [1, [Validators.required, Validators.min(1)]],
        padding: [2, [Validators.required, Validators.min(0)]]
      }));

      if (this.convLayers.length > 1) {
        this.commonChannels.push(this.lastChannel);
      } else {
        this.firstChannel = 1;
        this.commonChannels = [];
      }

      this.lastChannel = 1;
    }

    if (layer === 'fcLayer') {
      this.fcLayers.push(this.fb.group({
        unitCount: [1, [Validators.required, Validators.min(1)]]
      }));
    }
  }

  trainNetwork() {
    const captureForm: any = JSON.parse(JSON.stringify(this.playgroundForm.value));
    const objToSend = {
      batch_size_train: +captureForm.batchSizeTrain,
      batch_size_test: +captureForm.batchSizeTest,
      num_epochs: +captureForm.epoch,
      learning_rate: +captureForm.learning_rate,
      conv_layers: captureForm.convLayers.slice(0),
      layers: captureForm.fcLayers.map(layer => layer.unitCount)
    };


    this.playgroundData.batchSizeTrain = +captureForm.batchSizeTrain;
    this.playgroundData.batchSizeTest = +captureForm.batchSizeTest;
    this.playgroundData.epoch = +captureForm.epoch;
    this.playgroundData.selectedLearningRates = this.playgroundData.learningRates.findIndex(
      learningRate => learningRate.value === captureForm.learning_rate
    );

    this.playgroundData.firstChannel = this.firstChannel;
    this.playgroundData.lastChannel = this.lastChannel;
    this.playgroundData.commonChannels = this.commonChannels;

    this.playgroundData.convLayers = captureForm.convLayers.slice(0);
    this.playgroundData.fcLayers = captureForm.fcLayers.map(layer => layer.unitCount);
    this.dataService.playgroundData.next(this.playgroundData);

    objToSend.conv_layers.forEach((convLayer, convLayerIndex) => {
      if (convLayerIndex === 0) {
        convLayer.inChannel = this.firstChannel;
      } else {
        convLayer.inChannel = this.commonChannels[convLayerIndex - 1];
      }

      if (convLayerIndex === objToSend.conv_layers.length - 1) {
        convLayer.outChannel = this.lastChannel;
      } else {
        convLayer.outChannel = this.commonChannels[convLayerIndex];
      }
    });


    this.dataService.vizTopology.next(objToSend);
    this.dataService.vizWeights.next(null);
    this.networkService.send('mlp', JSON.parse(JSON.stringify(objToSend)));


    // console.clear();
    // console.log(objToSend);
    // console.log(this.firstChannel);
    // console.log(this.commonChannels);
    // console.log(this.lastChannel);
  }

  reset() {
    this.dataService.playgroundData.next(new Playground());
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

            const selectedFile = this.dataService.selectedFile.getValue();
            if (selectedFile) {
              this.selectedFileClick(selectedFile);
            } else {
              this.selectedFileClick(this.files[0].value);
            }
          }
        }
      );
  }

  selectedFileClick(filePath) {
    this.selectedFile = filePath;
  }

  visualize() {
    this.dataService.selectedFile.next(this.selectedFile);
    this.dataService.vizTopology.next(null);
    this.dataService.vizWeights.next(null);
    this.dataService.untrainedWeights.next(null);
    this.dataService.filterWeights.next(null);

    const nextEpochConfig = new EpochConfig();
    nextEpochConfig.epochRange = this.files.find(element => element.value === this.selectedFile).epochRange.map(x => x += 1);
    let epochToVisualize = nextEpochConfig.epochRange[1] - 1;
    let topologyTemp;

    if (this.router.url.includes('archive')) {
      this.heatmapNormalConfig.weightValueMin = this.files.find(element => element.value === this.selectedFile).weightMinMax[0];
      this.heatmapNormalConfig.weightValueMax = this.files.find(element => element.value === this.selectedFile).weightMinMax[1];

      this.dataService.optionData.next({
        epochSliderConfig: nextEpochConfig,
        heatmapNormalConfig: this.heatmapNormalConfig,
        drawFully: this.drawFully
      });

      this.createHeatmap(0, true);
      epochToVisualize = 0;

      this.playgroundService.getTopology(this.selectedFile)
        .pipe(
          take(1),
          concatMap(topology => {
            topologyTemp = topology;
            return this.playgroundService.visualize(this.selectedFile, epochToVisualize);
          })
        )
        .subscribe(val => {
          const currEpoch = `epoch_0`;
          const filterWeights = {};

          Object.keys(val).forEach(key => {
            if (key.startsWith('c')) {
              filterWeights[key] = val[key];
              delete val[key];
            }
          });

          this.dataService.vizTopology.next(topologyTemp);
          if (val) {
            this.dataService.vizWeights.next({ [currEpoch]: val });
            this.dataService.filterWeights.next(filterWeights);
          }
        });
    }

    if (this.router.url.includes('ablation')) {
      this.playgroundService.getTopology(this.selectedFile)
        .pipe(
          take(1),
          concatMap(topology => {
            this.dataService.vizTopology.next(topology);
            return this.playgroundService.visualize(this.selectedFile, epochToVisualize);
          })
        )
        .subscribe(val => {
          if (val) {
            this.dataService.vizWeights.next(val);
          }
        });

      const untrainedFile = this.selectedFile.replace('.json', '_untrained.json');
      this.playgroundService.getUntrainedWeights(untrainedFile)
        .pipe(take(1))
        .subscribe(val => { this.dataService.untrainedWeights.next(val); });
    }
  }

  resetOptions() {
    this.dataService.optionData.next(new Option(this.epochSliderConfig, new HeatmapConfig(), false));
  }

  applyOptions() {
    this.dataService.optionData.next({
      epochSliderConfig: this.epochSliderConfig,
      heatmapNormalConfig: this.heatmapNormalConfig,
      drawFully: this.drawFully
    });

    if (this.router.url.includes('builder')) {
      if (this.dataService.lastTraining.getValue()) {
        const param = {
          data: this.dataService.lastTraining.getValue(),
          heatmapNormalConfig: this.heatmapNormalConfig
        };
        setTimeout(() => {
          this.dataService.createHeatmap.next(param);
        }, 200);
      }
    } else if (this.router.url.includes('archive')) {
      if (this.epochSliderConfig) {
        this.createHeatmap(this.epochSliderConfig.epochValue - 1, false);
      }
    }
  }

  tabChanged(tabChangeEvent: MatTabChangeEvent) {
    this.activeSettingsTab = tabChangeEvent.index;
  }

  createHeatmap(epoch, newFile) {
    this.networkService.createHeatmapFromFile(
      this.selectedFile,
      epoch,
      [this.heatmapNormalConfig.weightValueMin, this.heatmapNormalConfig.weightValueMax],
      this.drawFully,
      newFile,
      this.heatmapNormalConfig.density,
      undefined
    )
      .pipe(take(1))
      .subscribe(data => {
        const param = {
          data: data,
          heatmapNormalConfig: this.heatmapNormalConfig
        };
        this.dataService.createHeatmap.next(param);
      });
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
