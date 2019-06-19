import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { MatTabChangeEvent } from '@angular/material';

import { takeUntil, take, filter } from 'rxjs/operators';
import { Subject } from 'rxjs';

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
export class SettingsComponent implements OnInit, OnDestroy {
  activeSceneTab: number;
  activeSettingsTab: number;

  playgroundForm: FormGroup;
  playgroundData: Playground;

  firstChannel; lastChannel;
  commonChannels;

  files; selectedFile;

  heatmapNormalConfig;
  drawFully;

  destroyed = new Subject<void>();

  constructor(
    public router: Router,
    private fb: FormBuilder,
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
    this.activeSceneTab = this.dataService.activeSceneTab;



    if (this.router.url.includes('builder')) {
      this.playgroundData = this.dataService.playgroundData;
      this.createForm();

      this.dataService.resetPlaygroundForm
        .pipe(
          takeUntil(this.destroyed),
          filter(val => val === true)
        )
        .subscribe(() => {
          this.playgroundData = this.dataService.playgroundData;
          this.createForm();
        });
    }


    if (this.router.url.includes('builder') || this.router.url.includes('archive')) {
      const currOption = this.dataService.optionData;
      this.heatmapNormalConfig = currOption.heatmapNormalConfig;
      this.drawFully = currOption.drawFully;

      this.dataService.resetOption
        .pipe(
          takeUntil(this.destroyed),
          filter(val => val === true)
        )
        .subscribe(() => {
          const defaultOption = this.dataService.optionData;
          this.heatmapNormalConfig = defaultOption.heatmapNormalConfig;
          this.drawFully = defaultOption.drawFully;
        });
    }


    if (this.router.url.includes('archive') || this.router.url.includes('ablation')) {
      this.scanForFiles();
    }
  }

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
    const capturedForm: any = JSON.parse(JSON.stringify(this.playgroundForm.value));
    const objToSend = {
      batch_size_train: +capturedForm.batchSizeTrain,
      batch_size_test: +capturedForm.batchSizeTest,
      num_epochs: +capturedForm.epoch,
      learning_rate: +capturedForm.learning_rate,
      conv_layers: capturedForm.convLayers.slice(0),
      layers: capturedForm.fcLayers.map(layer => layer.unitCount)
    };


    this.playgroundData.batchSizeTrain = +capturedForm.batchSizeTrain;
    this.playgroundData.batchSizeTest = +capturedForm.batchSizeTest;
    this.playgroundData.epoch = +capturedForm.epoch;
    this.playgroundData.selectedLearningRates = this.playgroundData.learningRates.findIndex(
      learningRate => learningRate.value === capturedForm.learning_rate
    );

    this.playgroundData.firstChannel = this.firstChannel;
    this.playgroundData.lastChannel = this.lastChannel;
    this.playgroundData.commonChannels = this.commonChannels;

    this.playgroundData.convLayers = capturedForm.convLayers.slice(0);
    this.playgroundData.fcLayers = capturedForm.fcLayers.map(layer => layer.unitCount);

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


    this.networkService.send('mlp', JSON.parse(JSON.stringify(objToSend)));


    this.dataService.playgroundData = this.playgroundData;
    this.dataService.topology = objToSend;
    this.dataService.trainNetwork.next(true);



    // console.clear();
    // console.log(objToSend);
    // console.log(this.playgroundData);
    // console.log(this.firstChannel);
    // console.log(this.commonChannels);
    // console.log(this.lastChannel);
  }

  resetForm() {
    this.dataService.playgroundData = new Playground();
    this.dataService.resetPlaygroundForm.next(true);
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

            const selectedFile = this.dataService.selectedFile;
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
    this.dataService.selectedFile = this.selectedFile;

    const nextEpochConfig = new EpochConfig();
    nextEpochConfig.epochRange = this.files.find(element => element.value === this.selectedFile).epochRange.map(x => x += 1);
    this.dataService.epochSliderConfig = nextEpochConfig;

    if (this.router.url.includes('archive')) {
      this.heatmapNormalConfig.weightValueMin = this.files.find(element => element.value === this.selectedFile).weightMinMax[0];
      this.heatmapNormalConfig.weightValueMax = this.files.find(element => element.value === this.selectedFile).weightMinMax[1];
      this.dataService.optionData = {
        heatmapNormalConfig: this.heatmapNormalConfig,
        drawFully: this.drawFully
      };
    }


    this.dataService.visualize.next(true);
    // this.dataService.filterWeights.next(null);
  }

  resetOptions() {
    this.dataService.optionData = new Option(new HeatmapConfig(), false);
    this.dataService.resetOption.next(true);
  }

  applyOptions() {
    this.dataService.optionData = {
      heatmapNormalConfig: this.heatmapNormalConfig,
      drawFully: this.drawFully
    };
    this.dataService.applyOption.next(true);
  }

  tabChanged(tabChangeEvent: MatTabChangeEvent) {
    this.activeSettingsTab = tabChangeEvent.index;
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
