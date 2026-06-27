let pendingFiles = null;
function setPendingUpload(files) {
  pendingFiles = files;
}
function consumePendingUpload() {
  const f = pendingFiles;
  pendingFiles = null;
  return f;
}
export {
  consumePendingUpload as c,
  setPendingUpload as s
};
