import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { MatTabChangeEvent } from '@angular/material';

import { debounceTime, takeUntil, take } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { PlaygroundService } from '../playground.service';
import { NetworkService } from '../network.service';
import { DataService } from '../services/data.service';

import { Playground, TfjsLayer } from '../models/playground.model';
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

      setTimeout(() => { this.layerCountChange(); }, 0);
    } else if (this.router.url.includes('archive') || this.router.url.includes('ablation')) {
      this.scanForFiles();
    }
  }

  ngAfterViewInit() { }

  createForm() {
    this.playgroundForm = this.fb.group({
      batchSizeTrain: [0, [Validators.required, Validators.min(0)]],
      batchSizeTest: [0, [Validators.required, Validators.min(0)]],
      epoch: [0, [Validators.required, Validators.min(0)]],

      learning_rate: ['', Validators.required],
      layerCount: [0, [Validators.required, Validators.min(0)]],

      layers: this.fb.array([])
    });

    this.playgroundForm.patchValue({
      batchSizeTrain: this.playgroundData.batchSizeTrain,
      batchSizeTest: this.playgroundData.batchSizeTest,
      epoch: this.playgroundData.epoch,

      learning_rate: this.playgroundData.learningRates[this.playgroundData.selectedLearningRates].value,
      layerCount: this.playgroundData.layerCount
    });

    this.playgroundForm.setControl('layers', this.fb.array(
      this.playgroundData.layers.map(layer => this.fb.group({
        unitCount: [layer.unitCount, [Validators.required, Validators.min(1)]]
      }))
    ));
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
      batch_size_train: +captureForm.batchSizeTrain,
      batch_size_test: +captureForm.batchSizeTest,
      num_epochs: +captureForm.epoch,
      layers: []
    };
    this.playgroundData.batchSizeTest = +captureForm.batchSizeTest;
    this.playgroundData.batchSizeTrain = +captureForm.batchSizeTrain;
    this.playgroundData.epoch = +captureForm.epoch;
    this.playgroundData.layerCount = +captureForm.layerCount;
    this.playgroundData.selectedLearningRates = this.playgroundData.learningRates.findIndex(
      learningRate => learningRate.value === captureForm.learning_rate
    );
    this.playgroundData.layers = [];

    captureForm.layers.forEach(layer => {
      objToSend.layers.push(layer.unitCount);
      this.playgroundData.layers.push(new TfjsLayer(layer.unitCount, 'relu'));
    });

    this.dataService.vizTopology.next(this.playgroundForm.value);
    this.dataService.vizWeights.next(null);
    this.networkService.send('mlp', JSON.parse(JSON.stringify(objToSend)));

    this.dataService.playgroundData.next(this.playgroundData);
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
    this.dataService.vizWeights.next(null);

    const nextEpochConfig = new EpochConfig();
    nextEpochConfig.epochRange = this.files.find(element => element.value === this.selectedFile).epochRange.map(x => x += 1);
    let epochToVisualize = nextEpochConfig.epochRange[1] - 1;

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
    }

    this.playgroundService.visualize(this.selectedFile, epochToVisualize)
      .pipe(take(1))
      .subscribe(val => {
        let layers: any[] = this.selectedFile.substring(this.selectedFile.indexOf('[') + 1, this.selectedFile.indexOf(']'))
          .replace(/\s/g, '')
          .split(',')
          .map(layer => +layer);
        const currEpoch = `epoch_0`;

        layers = layers.map(unitCount => { return { 'unitCount': unitCount }; });

        this.dataService.vizTopology.next({ 'layers': layers });
        if (val) { this.dataService.vizWeights.next({ [currEpoch]: val }); }
      });

    if (this.router.url.includes('ablation')) {
      this.dataService.plotAccuracies.next(true);
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




