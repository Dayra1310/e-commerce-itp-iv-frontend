/* ============================================
   Editar Perfil - JavaScript
   ============================================ */

let profile = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) {
    goToLogin();
    return;
  }
  await loadProfile();
});

async function loadProfile() {
  try {
    const res = await clientApi.getProfile();
    if (res.success && res.data) {
      profile = res.data;
      fillForm();
    }
  } catch (e) {
    showToast(e.message || 'No se pudo cargar el perfil', 'error');
    goToLogin();
  }
}

function fillForm() {
  if (!profile) return;
  document.getElementById('edit-name').value = profile.nombre || '';
  document.getElementById('edit-email').value = profile.email || '';
  document.getElementById('edit-phone').value = profile.telefono || '';
}

async function handleSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('edit-name').value.trim();
  const phone = document.getElementById('edit-phone').value.trim();

  if (!name) {
    showToast('El nombre es obligatorio', 'error');
    return;
  }

  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<div class="spinner"></div> Guardando...';

  try {
    await clientApi.updateProfile({
      nombre: name,
      telefono: phone,
    });

    showToast('Perfil actualizado exitosamente', 'success');

    setTimeout(() => {
      window.location.href = 'perfil.html';
    }, 1000);
  } catch (e) {
    showToast(e.message || 'Error al actualizar el perfil', 'error');
    saveBtn.disabled = false;
    saveBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
      Guardar Cambios
    `;
  }
}
