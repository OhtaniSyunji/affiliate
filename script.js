const targetUrlInput = document.getElementById("targetUrl");
const imageInput = document.getElementById("imageInput");
const createBtn = document.getElementById("createBtn");
const preview = document.getElementById("preview");
const selectedImage = document.getElementById("selectedImage");
const resultBox = document.getElementById("resultBox");
const generatedUrl = document.getElementById("generatedUrl");
const copyBtn = document.getElementById("copyBtn");
const formView = document.getElementById("formView");

let imageFile = null;

imageInput.addEventListener("change", (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  imageFile = file;
  const reader = new FileReader();
  reader.onload = () => {
    selectedImage.src = String(reader.result || "");
    preview.classList.add("active");
  };
  reader.readAsDataURL(file);
});

createBtn.addEventListener("click", async () => {
  const target = targetUrlInput.value.trim();

  if (!target) {
    alert("飛ばしたいサイトのURLを入力してください。");
    return;
  }

  if (!imageFile) {
    alert("画像を選択してください。");
    return;
  }

  const formData = new FormData();
  formData.append("targetUrl", target);
  formData.append("image", imageFile);

  try {
    const response = await fetch("/api/create", {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "作成に失敗しました");
    }

    generatedUrl.textContent = data.url;
    resultBox.classList.add("visible");
    formView.style.display = "none";
  } catch (error) {
    alert(error.message || "作成に失敗しました");
  }
});

copyBtn.addEventListener("click", async () => {
  const text = generatedUrl.textContent;
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = "コピーしました";
    setTimeout(() => (copyBtn.textContent = "コピー"), 1200);
  } catch (error) {
    copyBtn.textContent = "コピー失敗";
    setTimeout(() => (copyBtn.textContent = "コピー"), 1200);
  }
});
