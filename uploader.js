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

const blob =
  new Blob(
    [html],
    { type: "text/html" }
  );

const url =
  URL.createObjectURL(blob);

window.open(
  url,
  "_blank"
);

    } catch (err) {

      console.error(err);
      alert(err);

    }

  });

});