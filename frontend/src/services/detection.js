let modelPromise;
const MIN_PERSON_CONFIDENCE = 0.7;

export function loadPersonModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const [tf, cocoSsd] = await Promise.all([
        import('@tensorflow/tfjs'),
        import('@tensorflow-models/coco-ssd')
      ]);
      await tf.ready();
      return cocoSsd.load({ base: 'lite_mobilenet_v2' });
    })().catch((error) => {
      modelPromise = undefined;
      throw error;
    });
  }
  return modelPromise;
}

export async function detectPeople(model, video) {
  const predictions = await model.detect(video, 20, MIN_PERSON_CONFIDENCE);
  return predictions
    .filter((prediction) => prediction.class === 'person' && prediction.score >= MIN_PERSON_CONFIDENCE)
    .map((prediction) => ({
      x: prediction.bbox[0],
      y: prediction.bbox[1],
      width: prediction.bbox[2],
      height: prediction.bbox[3],
      score: prediction.score
    }));
}