function isVideoFile(fileName) {
    if (!fileName)
        return false;
    const videoExtensions = [".mp4", ".m3u8", ".mov", ".avi", ".webm"];
    return videoExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
}
function isImageFile(fileName) {
    if (!fileName)
        return false;
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
}
