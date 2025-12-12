export function showNotification(message, type = 'info') {
  const notification = document.createElement('div');

  let bgClass = 'bg-blue-500';
  let icon = 'fa-info-circle';

  if (type === 'success') {
    bgClass = 'bg-green-500';
    icon = 'fa-check-circle';
  } else if (type === 'error') {
    bgClass = 'bg-red-500';
    icon = 'fa-exclamation-circle';
  } else if (type === 'warning') {
    bgClass = 'bg-yellow-500';
    icon = 'fa-exclamation-triangle';
  }

  notification.className = `fixed top-4 right-4 ${bgClass} text-white px-4 py-2 rounded-lg shadow-lg flex items-center z-50 transform transition-transform duration-300 translate-x-full`;
  notification.innerHTML = `<i class="fa ${icon} mr-2"></i><span>${message}</span>`;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.remove('translate-x-full');
  }, 50);

  setTimeout(() => {
    notification.classList.add('translate-x-full');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
