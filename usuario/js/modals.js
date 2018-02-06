function modal_init (modal,shown,hidden) {
    modal.on('shown.bs.modal', shown);
    modal.on('hidden.bs.modal', hidden);
}