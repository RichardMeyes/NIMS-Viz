import { Injectable } from '@angular/core';
import * as tf from '@tensorflow/tfjs';

@Injectable({
  providedIn: 'root'
})
export class PlaygroundService {

  constructor() { }

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

  arrayOne(n: number): any[] {
    return Array(n);
  }
}
