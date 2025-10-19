const preview = document.getElementById('image-preview');

function show_preview(event) {
  const imageUrl = event.currentTarget.dataset.image;
  if (!imageUrl) return;

  preview.innerHTML = `<img src="${imageUrl}" alt="preview">`;
  preview.style.display = 'block';
  preview.style.left = (event.pageX + 20) + 'px';
  preview.style.top = (event.pageY - 20) + 'px';
  preview.style.opacity = 1;
}

function hide_preview() {
  preview.style.display = 'none';
  preview.style.opacity = 0;
}


// Preload images for better performance when they come into view
const preloadImage = (url) => { const img = new Image(); img.src = url; };

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const url = entry.target.dataset.image;
      if (url) preloadImage(url);
      observer.unobserve(entry.target);
    }
  });
});

document.querySelectorAll("[data-image]").forEach(el => observer.observe(el))