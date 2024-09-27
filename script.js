const repoOwner = 'liet-git';
const repoName = 'yan.github.io';
const sourceFolder = 'source';

// Create a cache object to store directory structures
let directoryCache = {};

// GitHub API URL for fetching folder contents
const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${sourceFolder}`;

// Fetch the contents of the source folder from GitHub
async function fetchDirectoryContents(path = '') {
  // Check if the path is cached
  if (directoryCache[path]) {
    return directoryCache[path]; // Return cached data
  }

  try {
    // If not cached, fetch from API and store in cache
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${sourceFolder}/${path}`);
    
    // Check for errors
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`); // Throw an error if response is not OK
    }

    const data = await response.json();

    // Store the fetched data in the cache
    directoryCache[path] = data;
    return data;

  } catch (error) {
    displayErrorMessage(error.message); // Handle errors by displaying the message
    return []; // Return an empty array to avoid further errors
  }
}

// Fetch commit data for a specific file
async function fetchFileCommitData(filePath) {
  try {
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/commits?path=${filePath}`);
    
    // Check for errors
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`); // Throw an error if response is not OK
    }

    const commits = await response.json();
    return commits.length > 0 ? commits[0] : null; // Return the most recent commit
  } catch (error) {
    displayErrorMessage(error.message); // Handle errors by displaying the message
    return null; // Return null to avoid further errors
  }
}

// Function to display the error message in the file viewer
function displayErrorMessage(message) {
  const viewer = document.getElementById('file-viewer');
  viewer.innerHTML = `<h1>Sorry, an error occurred.</h1><p>${message}</p>`; // Display the error message
}

// Format the fetched content in the same Apache-style HTML format
async function renderDirectoryListing(contents, currentPath = '') {
  const listing = document.getElementById("directory-listing");
  listing.innerHTML = '';

  // Show "Parent Directory" link if we're not in the root directory
  if (currentPath !== '') {
    const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));

    listing.innerHTML += `
      <tr>
        <td valign="top"><img src="icons/back.gif" alt="[PARENT]" /></td>
        <td><a href="#" onclick="navigate('${parentPath}')">Parent Directory</a></td>
        <td align="right">-</td>
        <td align="right">-</td>
        <td>&nbsp;</td>
      </tr>
    `;
  }

  // Render the rest of the directory contents
  for (const item of contents) {
    const icon = item.type === 'dir' ? 'folder.gif' : 'text.gif';
    const size = item.size ? formatFileSize(item.size) : '-';
    
    // Fetch commit data
    const commitData = await fetchFileCommitData(item.path);
    const modified = commitData ? new Date(commitData.commit.author.date).toLocaleDateString() : 'N/A'; // Get only the date
    const description = commitData ? (commitData.commit.message.length > 15 ? commitData.commit.message.slice(0, 15) + '...' : commitData.commit.message) : 'No description available'; // Truncate description

    const itemName = item.name;
    const itemPath = item.path.replace(`${sourceFolder}/`, '');

    const clickHandler = item.type === 'dir'
      ? `navigate('${itemPath}')`
      : `loadFileContent('${item.path}')`;  // If it's a file, fetch the file content

    listing.innerHTML += `
      <tr>
        <td valign="top"><img src="icons/${icon}" alt="[${item.type.toUpperCase()}]" /></td>
        <td><a href="#" onclick="${clickHandler}">${itemName}${item.type === 'dir' ? '/' : ''}</a></td>
        <td align="right">${modified}</td>
        <td align="right">${size}</td>
        <td>${description}</td>
      </tr>
    `;
  }
}

// Format file sizes in KB, MB, etc.
function formatFileSize(size) {
  if (size < 1024) return size + ' B';
  else if (size < 1048576) return (size / 1024).toFixed(2) + ' KB';
  else return (size / 1048576).toFixed(2) + ' MB';
}

// Navigate through folders
async function navigate(path) {
  const contents = await fetchDirectoryContents(path);
  renderDirectoryListing(contents, path);
  document.getElementById("directory-title").innerText = `Index of /${sourceFolder}/${path}`;
}

// Load the HTML file content dynamically
async function loadFileContent(filePath) {
  try {
    const response = await fetch(`https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/${filePath}`);
    
    // Check for errors
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`); // Throw an error if response is not OK
    }

    const content = await response.text();  // Fetch the file content as text

    // Display the HTML content on the right-hand side without escaping
    const viewer = document.getElementById('file-viewer');
    viewer.innerHTML = content;

  } catch (error) {
    displayErrorMessage(error.message); // Handle errors by displaying the message
  }
}

// Initial fetch and render of root directory
(async function () {
  const rootContents = await fetchDirectoryContents();
  renderDirectoryListing(rootContents);
  
  // Load about.html after rendering the directory
  await loadFileContent(`${sourceFolder}/about.html`);
})();

