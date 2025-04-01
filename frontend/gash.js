let isEditing = false;
let saveTimer = null;

document.addEventListener("DOMContentLoaded", () => {
  const editor = document.getElementById("editor");

  editor.innerHTML = "<p>Start typing here...</p>";

  editor.addEventListener("input", () => {
    isEditing = true;
    document.getElementById("saveStatus").textContent = "Editing...";

    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveContent, 1000);
  });

  editor.addEventListener("paste", handlePaste);

  editor.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      splitBlock();
    }
  });

  editor.addEventListener("blur", normalizeEditor);
});

function getSelectedRange() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;
  return selection.getRangeAt(0);
}

function setCaret(el, pos) {
  const selection = window.getSelection();
  const range = document.createRange();
  range.setStart(el, pos);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function wrapSelection(tagName, attributes = {}) {
  const selection = window.getSelection();
  if (!selection.rangeCount || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  const editor = document.getElementById("editor");
  if (!editor.contains(range.commonAncestorContainer)) return;

  const wrapper = document.createElement(tagName);

  for (const [key, value] of Object.entries(attributes)) {
    if (key === "style" && typeof value === "object") {
      for (const [prop, val] of Object.entries(value)) {
        wrapper.style[prop] = val;
      }
    } else {
      wrapper.setAttribute(key, value);
    }
  }

  const fragment = range.extractContents();
  wrapper.appendChild(fragment);

  range.insertNode(wrapper);

  selection.removeAllRanges();
  const newRange = document.createRange();
  newRange.setStartAfter(wrapper);
  newRange.setEndAfter(wrapper);
  selection.addRange(newRange);
}

function formatBold() {
  wrapSelection("strong");
  saveContent();
}

function formatItalic() {
  wrapSelection("em");
  saveContent();
}

function formatHeading(level) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  let node = selection.anchorNode;
  const editor = document.getElementById("editor");

  while (node && node.parentNode !== editor) {
    node = node.parentNode;
  }

  if (!node || node === editor) return;

  const newHeading = document.createElement(`h${level}`);

  while (node.firstChild) {
    newHeading.appendChild(node.firstChild);
  }

  editor.replaceChild(newHeading, node);

  const range = document.createRange();
  range.selectNodeContents(newHeading);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);

  saveContent();
}

function formatParagraph() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  let node = selection.anchorNode;
  const editor = document.getElementById("editor");

  while (node && node.parentNode !== editor) {
    node = node.parentNode;
  }

  if (!node || node === editor) return;

  const newPara = document.createElement("p");

  while (node.firstChild) {
    newPara.appendChild(node.firstChild);
  }

  editor.replaceChild(newPara, node);

  const range = document.createRange();
  range.selectNodeContents(newPara);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);

  saveContent();
}

function formatJustify(alignment) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  let node = selection.anchorNode;
  const editor = document.getElementById("editor");

  while (node && node.parentNode !== editor) {
    node = node.parentNode;
  }

  if (!node || node === editor) return;

  node.style.textAlign = alignment;

  saveContent();
}

function insertImage() {
  const url = prompt("Enter image URL or leave empty to upload:");
  if (url) {
    const img = document.createElement("img");
    img.src = url;

    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);

      range.setStartAfter(img);
      range.setEndAfter(img);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      document.getElementById("editor").appendChild(img);
    }

    saveContent();
  } else {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imgData = event.target.result;
          window.go.main.App.SaveImage(imgData, file.name).then((relPath) => {
            const img = document.createElement("img");
            img.src = relPath;

            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              range.insertNode(img);

              range.setStartAfter(img);
              range.setEndAfter(img);
              selection.removeAllRanges();
              selection.addRange(range);
            } else {
              document.getElementById("editor").appendChild(img);
            }

            saveContent();
          });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }
}

async function handlePaste(e) {
  if (e.clipboardData.items) {
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      if (e.clipboardData.items[i].type.indexOf("image") !== -1) {
        e.preventDefault();

        const blob = e.clipboardData.items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => {
          const imgData = event.target.result;
          window.go.main.App.SaveImage(imgData, "").then((relPath) => {
            const img = document.createElement("img");
            img.src = relPath;

            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              range.insertNode(img);

              range.setStartAfter(img);
              range.setEndAfter(img);
              selection.removeAllRanges();
              selection.addRange(range);
            } else {
              document.getElementById("editor").appendChild(img);
            }

            saveContent();
          });
        };
        reader.readAsDataURL(blob);
        return;
      }
    }
  }
}

function splitBlock() {
  const editor = document.getElementById("editor");
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);

  let block = range.startContainer;
  while (block && block.parentNode !== editor) {
    block = block.parentNode;
  }

  if (!block) {
    const p = document.createElement("p");
    p.innerHTML = "<br>";
    editor.appendChild(p);
    setCaret(p, 0);
    return;
  }

  const afterRange = range.cloneRange();
  afterRange.setStart(range.endContainer, range.endOffset);
  afterRange.setEndAfter(block.lastChild || block);
  const afterContent = afterRange.cloneContents();

  const newBlock = document.createElement(block.tagName);

  const isAtEnd = !Array.from(afterContent.childNodes).some((n) => {
    return (
      n.nodeType === Node.ELEMENT_NODE ||
      (n.nodeType === Node.TEXT_NODE && n.textContent.trim())
    );
  });

  if (isAtEnd) {
    newBlock.innerHTML = "<br>";
  } else {
    const extractRange = range.cloneRange();
    extractRange.setEndAfter(block.lastChild || block);
    const extracted = extractRange.extractContents();
    if (!extracted.childNodes.length) {
      newBlock.innerHTML = "<br>";
    } else {
      newBlock.appendChild(extracted);
    }
  }

  if (block.nextSibling) {
    editor.insertBefore(newBlock, block.nextSibling);
  } else {
    editor.appendChild(newBlock);
  }

  setCaret(newBlock, 0);

  if (!block.textContent.trim() && !block.querySelector("img")) {
    block.innerHTML = "<br>";
  }

  saveContent();
}

function normalizeEditor() {
  const editor = document.getElementById("editor");

  Array.from(editor.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      const p = document.createElement("p");
      p.textContent = node.textContent;
      editor.replaceChild(p, node);
    }
  });

  if (editor.innerHTML.trim() === "" || editor.innerHTML.trim() === "<br>") {
    editor.innerHTML = "<p><br></p>";
  }

  if (
    editor.firstChild &&
    !["H1", "H2", "H3", "H4", "H5", "H6", "P"].includes(
      editor.firstChild.nodeName,
    )
  ) {
    const p = document.createElement("p");
    p.appendChild(editor.firstChild);
    editor.insertBefore(p, editor.firstChild);
  }

  saveContent();
}

function saveContent() {
  if (!isEditing) return;

  const content = document.getElementById("editor").innerHTML;
  const htmlDoc = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Simple Editor Document</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
        img { max-width: 100%; }
    </style>
</head>
<body>
${content}
</body>
</html>`;

  window.go.main.App.SaveContent(htmlDoc, "").then((_filePath) => {
    document.getElementById("saveStatus").textContent = "Saved";
    isEditing = false;
  });
}
