import { Component, OnInit, ViewChild } from '@angular/core';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DataService } from 'src/app/services/data.service';

import * as d3 from 'd3';

@Component({
  selector: 'app-conv-filters-viz',
  templateUrl: './conv-filters-viz.component.html',
  styleUrls: ['./conv-filters-viz.component.scss']
})
export class ConvFiltersVizComponent implements OnInit {
  toolbarHeight;
  svg; svgWidth; svgHeight;
  vizGroup;

  convLayers; units;
  selectedConvLayer; selectedUnit;

  weights; showWeightsConfig;

  destroyed = new Subject<void>();

  @ViewChild('vizContainer') vizContainer;

  constructor(
    private dataService: DataService
  ) { }

  ngOnInit() {
    this.showWeightsConfig = {
      weightsFrame: {
        width: 84,
        height: 84,
        margin: 7.5,
        fill: 'whitesmoke',
        numElements: 0
      },
      positiveColor: d3.interpolateLab('whitesmoke', 'royalblue'),
      negativeColor: d3.interpolateLab('whitesmoke', 'indianred')
    };

    this.dataService.toolbarHeight
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { this.toolbarHeight = val; });

    this.dataService.filterWeights
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        this.weights = val;

        this.convLayers = [];
        if (val) {
          Object.keys(val).forEach(key => { this.convLayers.push(key); });
          this.selectedConvLayer = this.convLayers[0];
          this.selectedUnit = 0;

          this.convLayerSelected();
        }
      });
  }

  convLayerSelected() {
    this.units = [];
    for (let i = 0; i < this.weights[this.selectedConvLayer].length; i++) {
      this.units.push(i);
    }
    this.selectedUnit = 0;

    this.showFilterWeights();
  }

  showFilterWeights() {
    const self = this;

    this.showWeightsConfig.data = this.weights[this.selectedConvLayer][this.selectedUnit].map(inputWeights => {
      let tempInput = ['d3 workaround'];
      inputWeights.forEach(weights => { tempInput = tempInput.concat(weights); });
      return tempInput;
    });

    this.showWeightsConfig.weight = {
      numElements: this.weights[this.selectedConvLayer][this.selectedUnit][0].length,
      width: this.showWeightsConfig.weightsFrame.width / this.weights[this.selectedConvLayer][this.selectedUnit][0].length,
      height: this.showWeightsConfig.weightsFrame.height / this.weights[this.selectedConvLayer][this.selectedUnit][0].length
    };


    this.resetViz();


    const weightsFrame = this.vizGroup.selectAll('rect')
      .data(this.showWeightsConfig.data)
      .enter()
      .append('g');

    weightsFrame.append('rect')
      .attr('x', function (d, i) {
        const currIndex = i % self.showWeightsConfig.weightsFrame.numElements;
        const x = currIndex * (self.showWeightsConfig.weightsFrame.width + (2 * self.showWeightsConfig.weightsFrame.margin));

        return x;
      })
      .attr('y', function (d, i) {
        const currIndex = Math.floor(i / self.showWeightsConfig.weightsFrame.numElements);
        const y = currIndex * (self.showWeightsConfig.weightsFrame.height + (2 * self.showWeightsConfig.weightsFrame.margin));

        return y;
      })
      .attr('width', this.showWeightsConfig.weightsFrame.width)
      .attr('height', this.showWeightsConfig.weightsFrame.height)
      .style('fill', this.showWeightsConfig.weightsFrame.fill);


    console.clear();
    console.log(this.weights[this.selectedConvLayer]);
    console.log(this.weights[this.selectedConvLayer][this.selectedUnit]);

    console.log(this.showWeightsConfig.data);
    console.log(this.showWeightsConfig.weight);
  }

  resetViz() {
    this.svgWidth = window.innerWidth / 2;
    this.svgHeight = window.innerHeight - (this.toolbarHeight + this.dataService.bottomMargin) - 78.125;

    this.showWeightsConfig.weightsFrame.numElements = Math.floor(this.svgWidth /
      (this.showWeightsConfig.weightsFrame.width + 2 * this.showWeightsConfig.weightsFrame.margin));

    if (this.svg) { this.svg.remove(); }
    this.svg = d3.select(this.vizContainer.nativeElement)
      .append('svg')
      .attr('width', this.svgWidth)
      .attr('height', this.svgHeight)
    this.vizGroup = this.svg.append('g');
  }
}
