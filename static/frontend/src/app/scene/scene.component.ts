import {
  Component, OnInit, ViewChild, AfterViewInit, HostListener, Renderer2, Input, ChangeDetectorRef, OnDestroy, ViewEncapsulation
} from '@angular/core';
import { NetworkService } from '../network.service';

import * as THREE from 'three';
import * as Stats from 'stats.js/build/stats.min.js';
import * as simpleheat from 'simpleheat/simpleheat.js';
import * as tf from '@tensorflow/tfjs';
import { Chart } from 'chart.js';

import '../../customs/enable-three-examples.js';
import 'three/examples/js/renderers/CSS3DRenderer.js';
import 'three/examples/js/controls/OrbitControls';

// import { BrainComponent } from './brain/brain.component';
import { PlaygroundService } from '../playground.service';
import { generate, Subscription, Subject } from 'rxjs';
import { update } from '@tensorflow/tfjs-layers/dist/variables';
import { Playground, TfjsLayer } from '../playground.model';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { DataService } from '../services/data.service';
// import { MqttService, IMqttMessage } from 'ngx-mqtt';


@Component({
  selector: 'app-scene',
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class SceneComponent implements OnInit, AfterViewInit, OnDestroy {
  vizTopology: any;
  vizWeights: any;

  destroyed = new Subject<void>();

  constructor(
    private dataService: DataService,
    private networkService: NetworkService
  ) {

  }

  ngOnInit() {
    this.networkService.onMessage()
      .pipe(takeUntil(this.destroyed))
      .subscribe((message: JSON) => {
        const resultWeights = message['resultWeights'];
        this.dataService.vizWeights.next(resultWeights);
      });


    this.dataService.vizTopology
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { this.vizTopology = val; });

    this.dataService.vizWeights
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { this.vizWeights = val; });
  }

  ngAfterViewInit() {
  }

  public ngOnDestroy() {
    this.destroyed.next();
  }
}
