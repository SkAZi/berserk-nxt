export function view_observer(node) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.target instanceof HTMLElement)
        entry.target.style.visibility = entry.isIntersecting ? '' : 'hidden';
    });
  }, {threshold: 0.01});

  Array.from(node.children).forEach((child) => observer.observe(child));

  return {
    destroy() {
      observer.disconnect();
    }
  };
}