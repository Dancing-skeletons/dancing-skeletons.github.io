document.addEventListener("DOMContentLoaded", () => {

  const upload =
    document.getElementById("mdUpload");

  const generate =
    document.getElementById("generateBtn");

  generate.addEventListener("click", async () => {

    const file = upload.files[0];

    if (!file) {
      alert("Choose a markdown file");
      return;
    }

    try {

      const markdown =
        await file.text();

      const html =
        window.renderSong(
          markdown,
          file.name
        );

      const win =
        window.open("", "_blank");

      win.document.open();
      win.document.write(html);
      win.document.close();

    } catch(err) {

      console.error(err);
      alert(err);

    }

  });

});