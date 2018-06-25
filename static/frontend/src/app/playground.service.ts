import { Injectable } from '@angular/core';
import * as tf from '@tensorflow/tfjs';

@Injectable({
  providedIn: 'root'
})
export class PlaygroundService {
  shuffledTrainIndex: number;
  shuffledTestIndex: number;

  imageSize: number;
  numClasses: number;
  numDatasetElements: number;

  numTrainElements: number;
  numTestElements: number;

  mnistImagesSpritePath: string = 'https://storage.googleapis.com/learnjs-data/model-builder/mnist_images.png';
  mnistLabelsPath: string = 'https://storage.googleapis.com/learnjs-data/model-builder/mnist_labels_uint8';


  trainImages; testImages; datasetImages;
  trainLabels; testLabels; datasetLabels;

  trainIndices;
  testIndices;

  constructor() {
    this.imageSize = 10;
  }

  generateData(numPoints, coeff, sigma = 0.04) {
    return tf.tidy(() => {
      const [a, b, c, d] = [
        tf.scalar(coeff.a), tf.scalar(coeff.b), tf.scalar(coeff.c),
        tf.scalar(coeff.d)
      ];

      const xs = tf.randomUniform([numPoints], -1, 1);

      // Generate polynomial data
      const three = tf.scalar(3, 'int32');
      const ys = a.mul(xs.pow(three))
        .add(b.mul(xs.square()))
        .add(c.mul(xs))
        .add(d)
        // Add random noise to the generated data
        // to make the problem a bit more interesting
        .add(tf.randomNormal([numPoints], 0, sigma));

      // Normalize the y values to the range 0 to 1.
      const ymin = ys.min();
      const ymax = ys.max();
      const yrange = ymax.sub(ymin);
      const ysNormalized = ys.sub(ymin).div(yrange);

      return { xs, ys: ysNormalized };
    });
  }

  predict(x, randomCoefficients) {
    // y = a * x ^ 3 + b * x ^ 2 + c * x + d
    return tf.tidy(() => {
      return randomCoefficients.a.mul(x.pow(tf.scalar(3, 'int32')))
        .add(randomCoefficients.b.mul(x.square()))
        .add(randomCoefficients.c.mul(x))
        .add(randomCoefficients.d);
    });
  }

  loss(prediction, labels) {
    const error = prediction.sub(labels).square().mean();
    return error;
  }

  arrayOne(n: number): any[] {
    return Array.apply(null, Array(n)).map(Number.prototype.valueOf, 0);
  }

  async loadMnist() {
    this.shuffledTrainIndex = 0;
    this.shuffledTestIndex = 0;

    
    this.numClasses = 10;
    this.numDatasetElements = 65000;

    this.numTrainElements = 55000;
    this.numTestElements = this.numDatasetElements - this.numTrainElements;


    // Make a request for the MNIST sprited image.
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const imgRequest = new Promise((resolve, reject) => {
      img.crossOrigin = '';
      img.onload = () => {
        img.width = img.naturalWidth;
        img.height = img.naturalHeight;

        const datasetBytesBuffer =
          new ArrayBuffer(this.numDatasetElements * this.imageSize * 4);

        const chunkSize = 5000;
        canvas.width = img.width;
        canvas.height = chunkSize;

        for (let i = 0; i < this.numDatasetElements / chunkSize; i++) {
          const datasetBytesView = new Float32Array(
            datasetBytesBuffer, i * this.imageSize * chunkSize * 4,
            this.imageSize * chunkSize);
          ctx.drawImage(
            img, 0, i * chunkSize, img.width, chunkSize, 0, 0, img.width,
            chunkSize);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          for (let j = 0; j < imageData.data.length / 4; j++) {
            // All channels hold an equal value since the image is grayscale, so
            // just read the red channel.
            datasetBytesView[j] = imageData.data[j * 4] / 255;
          }
        }
        this.datasetImages = new Float32Array(datasetBytesBuffer);

        resolve();
      };
      img.src = this.mnistImagesSpritePath;
    });

    const labelsRequest = fetch(this.mnistLabelsPath);
    const [imgResponse, labelsResponse] = await Promise.all([imgRequest, labelsRequest]);

    this.datasetLabels = new Uint8Array(await labelsResponse.arrayBuffer());

    // Create shuffled indices into the train/test set for when we select a
    // random dataset element for training / validation.
    this.trainIndices = tf.util.createShuffledIndices(this.numTrainElements);
    this.testIndices = tf.util.createShuffledIndices(this.numTestElements);

    // Slice the the images and labels into train and test sets.
    this.trainImages = this.datasetImages.slice(0, this.imageSize * this.numTrainElements);
    this.testImages = this.datasetImages.slice(this.imageSize * this.numTrainElements);

    this.trainLabels = this.datasetLabels.slice(0, this.numClasses * this.numTrainElements);
    this.testLabels = this.datasetLabels.slice(this.numClasses * this.numTrainElements);

    return new Promise(function (resolve, reject) { resolve("done"); });
  }

  nextTrainBatch(batchSize) {
    return this.nextBatch(
      batchSize, [this.trainImages, this.trainLabels], () => {
        this.shuffledTrainIndex = (this.shuffledTrainIndex + 1) % this.trainIndices.length;
        return this.trainIndices[this.shuffledTrainIndex];
      });
  }

  nextTestBatch(batchSize) {
    return this.nextBatch(batchSize, [this.testImages, this.testLabels], () => {
      this.shuffledTestIndex = (this.shuffledTestIndex + 1) % this.testIndices.length;
      return this.testIndices[this.shuffledTestIndex];
    });
  }

  nextBatch(batchSize, data, index) {
    const batchImagesArray = new Float32Array(batchSize * this.imageSize);
    const batchLabelsArray = new Uint8Array(batchSize * this.numClasses);

    for (let i = 0; i < batchSize; i++) {
      const idx = index();

      const image =
        data[0].slice(idx * this.imageSize, idx * this.imageSize + this.imageSize);
      batchImagesArray.set(image, i * this.imageSize);

      const label =
        data[1].slice(idx * this.numClasses, idx * this.numClasses + this.numClasses);
      batchLabelsArray.set(label, i * this.numClasses);
    }

    const xs = tf.tensor2d(batchImagesArray, [batchSize, this.imageSize]);
    const labels = tf.tensor2d(batchLabelsArray, [batchSize, this.numClasses]);

    return { xs, labels };
  }


  extractWeights(model: any) {
    let weights: any = [];

    model.layers.forEach(layer => {
      let info: any = { "layer-name": layer.name, "weights": [] };
      let kernel: any = [];
      let bias: any = [];

      if (layer.getWeights()[0]) {
        let m = layer.getWeights()[0].shape[0];
        let eachFeature = tf.split(layer.getWeights()[0], m, 0);
        for (let i = 0; i < m; i++) {
          kernel[i] = [];
          kernel[i] = Array.from(eachFeature[i].dataSync());
        }
      }

      if (layer.getWeights()[0]) {
        bias = Array.from(layer.getWeights()[1].dataSync());
      }

      if (kernel) { info["weights"].push(kernel); }
      if (bias) { info["weights"].push(bias); }

      weights.push(info);
    });

    return weights;
  }
}
