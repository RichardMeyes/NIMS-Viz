import { Component, OnInit, OnDestroy } from '@angular/core';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DataService } from '../services/data.service';
import { NetworkService } from '../network.service';


@Component({
  selector: 'app-ablation',
  templateUrl: './ablation.component.html',
  styleUrls: ['./ablation.component.scss']
})
export class AblationComponent implements OnInit, OnDestroy {

  vizTopology: any;
  vizWeights: any;
  selectedFile: any;

  destroyed = new Subject<void>();

  constructor(
    private dataService: DataService,
    private networkService: NetworkService
  ) { }

  ngOnInit() {
    this.dataService.vizTopology
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { this.vizTopology = val; });

    this.dataService.vizWeights
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { this.vizWeights = val; });

    this.dataService.selectedFile
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { this.selectedFile = val; });
  }

  testNetwork() {
    const network = this.selectedFile.split('\\')[1]
      .split('.')[0];
    console.log(network);
    console.log(this.selectedFile);

    const body = {
      network: network,
      layers: [1],
      units: [2]
    };

    console.log(body);

    this.networkService.ablationTest(body)
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { console.log(val); });
  }

  public ngOnDestroy() {
    this.destroyed.next();
  }
}
