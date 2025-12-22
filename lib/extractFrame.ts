// Simple frame extraction utility
export async function extractFrame3(videoFile: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Create blob URL
        const url = URL.createObjectURL(videoFile);
        video.src = url;
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = "anonymous"; // Handle cross-origin if needed

        // Timeout fallback
        const timeoutId = setTimeout(() => {
            URL.revokeObjectURL(url);
            reject(new Error('Frame extraction timed out'));
        }, 5000);

        video.addEventListener('loadedmetadata', () => {
            // Seek to absolute start
            video.currentTime = 0.0;
        });

        video.addEventListener('seeked', () => {
            if (!ctx) {
                clearTimeout(timeoutId);
                URL.revokeObjectURL(url);
                reject(new Error('Canvas context not available'));
                return;
            }

            try {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0);

                const frameUrl = canvas.toDataURL('image/jpeg', 0.8);
                clearTimeout(timeoutId);
                URL.revokeObjectURL(url);
                resolve(frameUrl);
            } catch (err) {
                clearTimeout(timeoutId);
                URL.revokeObjectURL(url);
                reject(err);
            }
        });

        video.addEventListener('error', (e) => {
            clearTimeout(timeoutId);
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load video for frame extraction'));
        });
    });
}
