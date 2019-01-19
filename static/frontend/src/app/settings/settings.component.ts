import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';

import { debounceTime, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { PlaygroundService } from '../playground.service';
import { NetworkService } from '../network.service';

import { Playground } from '../playground.model';
import { DataService } from '../services/data.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit, AfterViewInit, OnDestroy {
  playgroundForm: FormGroup;
  playgroundData: Playground;

  files; selectedFile;

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
    this.playgroundData = new Playground();


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

  private selectedFileClick(filePath, isSetup?: boolean) {
    this.selectedFile = filePath;
    // // change slider values
    // this.epochSliderConfig.epochRange = this.files.find(element => element.value === filePath).epochRange;
    // this.epochSliderConfig.epochValue = this.epochSliderConfig.epochRange[1];
    // this.heatmapNormalConfig.weightValueMin = this.files.find(element => element.value === this.selectedFile).weightMinMax[0];
    // this.heatmapNormalConfig.weightValueMax = this.files.find(element => element.value === this.selectedFile).weightMinMax[1];
    // if (!isSetup) {
    //   this.createHeatmap(undefined, true);
    //   this.createGraph(this.selectedFile);
    // }
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
