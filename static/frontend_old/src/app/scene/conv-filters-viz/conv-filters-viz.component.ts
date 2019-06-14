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

  isInit;

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
      positiveColor: d3.interpolateLab('whitesmoke', 'indianred'),
      negativeColor: d3.interpolateLab('whitesmoke', 'royalblue')
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

          this.isInit = true;

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
    if (!this.isInit) {
      this.dataService.selectedFilter.next(`${this.selectedConvLayer}-${this.selectedUnit}`);
    } else {
      this.isInit = false;
    }

    const self = this;

    this.showWeightsConfig.minMax = [];
    this.showWeightsConfig.data = this.weights[this.selectedConvLayer][this.selectedUnit].map(inputWeights => {
      let tempInput = [];
      inputWeights.forEach(weights => { tempInput = tempInput.concat(weights); });

      this.showWeightsConfig.minMax.push({
        min: Math.min(...tempInput),
        max: Math.max(...tempInput)
      });

      tempInput.unshift('d3 workaround');
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

    weightsFrame.on('mouseenter', (d, i) => {
      this.dataService.selectedFilter.next(`${this.selectedConvLayer}-${this.selectedUnit}-${i}`);
    })
      .on('mouseleave', () => { this.dataService.selectedFilter.next(`${this.selectedConvLayer}-${this.selectedUnit}`); });

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


    let tempIndex = -1;
    weightsFrame.selectAll('rect')
      .data(d => d)
      .enter()
      .append('rect')
      .attr('x', function (d, i) {
        const rectXValue = +d3.select(this.parentNode).select('rect').attr('x');
        const xPosition = ((i - 1) % self.showWeightsConfig.weight.numElements) *
          self.showWeightsConfig.weight.width;

        return rectXValue + xPosition;
      })
      .attr('y', function (d, i) {
        const rectYValue = +d3.select(this.parentNode).select('rect').attr('y');
        const yPosition = Math.floor((i - 1) / self.showWeightsConfig.weight.numElements) *
          self.showWeightsConfig.weight.height;

        return rectYValue + yPosition;
      })
      .attr('width', this.showWeightsConfig.weight.width)
      .attr('height', this.showWeightsConfig.weight.height)
      .style('fill', (d, i) => {
        if (i === 1) { tempIndex++; }

        let scaledValue = 0;

        if (d > 0) {
          scaledValue = d / this.showWeightsConfig.minMax[tempIndex].max;
          return this.showWeightsConfig.positiveColor(scaledValue);
        } else if (d < 0) {
          scaledValue = d / this.showWeightsConfig.minMax[tempIndex].min;
          return this.showWeightsConfig.negativeColor(scaledValue);
        }
      });
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
