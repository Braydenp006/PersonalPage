#!/bin/sh
# Renders every resume PDF into page images for the on-screen viewer on the resume page.
# Run it again whenever you add or change a PDF in assets/Resumes/:   sh make-previews.sh
# Output: assets/Resumes/previews/<PDF name>-1.webp, -2.webp, ... (one per page). Needs pdftoppm (poppler) and ImageMagick.
set -e
cd "$(dirname "$0")"
mkdir -p assets/Resumes/previews
for pdf in assets/Resumes/*.pdf; do
  name=$(basename "$pdf" .pdf)
  rm -f "assets/Resumes/previews/$name"-*.webp
  pdftoppm -png -r 170 "$pdf" "assets/Resumes/previews/$name" # writes <name>-1.png, <name>-2.png, ...
  for png in "assets/Resumes/previews/$name"-*.png; do
    magick "$png" -quality 82 "${png%.png}.webp" && rm "$png"
  done
  echo "made previews for $name"
done
