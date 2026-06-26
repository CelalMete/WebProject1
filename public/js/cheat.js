document.addEventListener('DOMContentLoaded', () => {
    const thumbnails = document.querySelectorAll('.thumb');
    const mainFgImg = document.getElementById('fg-img');
    const srcElement = document.getElementById('src');
    const imageUrl = srcElement.dataset.src;
    mainFgImg.style.backgroundImage =`url('${imageUrl}')`
    if (thumbnails.length > 0 && mainFgImg) {
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                thumbnails.forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                mainFgImg.style.backgroundImage = `url('${thumb.src}')`;
            });
        });
    }
});