document.addEventListener("DOMContentLoaded", () => {

  const upload =
    document.getElementById("mdUpload");

  const preview =
    document.getElementById("previewFrame");

  const generate =
    document.getElementById("generateBtn");

  const download =
    document.getElementById("downloadBtn");

  let latestHTML = "";

  generate.addEventListener("click", async () => {

    const file = upload.files[0];

    if (!file) {
      alert("Choose a markdown file");
      return;
    }

    const markdown =
      await file.text();

    latestHTML =
      window.renderSong(
        markdown,
        file.name
      );

    preview.srcdoc =
      latestHTML;

    download.style.display =
      "inline-block";
  });

  download.addEventListener("click", () => {

    const blob =
      new Blob(
        [latestHTML],
        { type: "text/html" }
      );

    const a =
      document.createElement("a");

    a.href =
      URL.createObjectURL(blob);

    a.download =
      "generated.html";

    a.click();
  });

});