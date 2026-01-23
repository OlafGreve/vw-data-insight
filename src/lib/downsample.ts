/**
 * Largest Triangle Three Buckets (LTTB) downsampling algorithm
 * Preserves visual characteristics (peaks, valleys) while reducing data points
 */
export function downsampleLTTB<T extends { timestamp: Date; value: number }>(
  data: T[],
  threshold: number = 500
): T[] {
  if (data.length <= threshold || threshold < 3) {
    return data;
  }

  const sampled: T[] = [];
  
  // Always keep the first point
  sampled.push(data[0]);

  // Bucket size (leave room for first and last points)
  const bucketSize = (data.length - 2) / (threshold - 2);

  let lastSelectedIndex = 0;

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate bucket boundaries
    const bucketStart = Math.floor((i + 1) * bucketSize) + 1;
    const bucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length - 1);

    // Calculate average point for next bucket (used for triangle calculation)
    const nextBucketStart = bucketEnd;
    const nextBucketEnd = Math.min(Math.floor((i + 3) * bucketSize) + 1, data.length);
    
    let avgX = 0;
    let avgY = 0;
    let count = 0;
    
    for (let j = nextBucketStart; j < nextBucketEnd; j++) {
      avgX += data[j].timestamp.getTime();
      avgY += data[j].value;
      count++;
    }
    
    if (count > 0) {
      avgX /= count;
      avgY /= count;
    } else {
      // Use last point if no next bucket
      avgX = data[data.length - 1].timestamp.getTime();
      avgY = data[data.length - 1].value;
    }

    // Point from the last selected bucket
    const lastX = data[lastSelectedIndex].timestamp.getTime();
    const lastY = data[lastSelectedIndex].value;

    // Find point in current bucket with largest triangle area
    let maxArea = -1;
    let maxAreaIndex = bucketStart;

    for (let j = bucketStart; j < bucketEnd; j++) {
      const currentX = data[j].timestamp.getTime();
      const currentY = data[j].value;

      // Calculate triangle area using cross product
      const area = Math.abs(
        (lastX - avgX) * (currentY - lastY) -
        (lastX - currentX) * (avgY - lastY)
      );

      if (area > maxArea) {
        maxArea = area;
        maxAreaIndex = j;
      }
    }

    sampled.push(data[maxAreaIndex]);
    lastSelectedIndex = maxAreaIndex;
  }

  // Always keep the last point
  sampled.push(data[data.length - 1]);

  return sampled;
}
