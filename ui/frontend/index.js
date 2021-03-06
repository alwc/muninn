const React = require("react");
const ReactDOM = require("react-dom");
const path = require("path");
const withParents = require("unist-util-parents");
const { SocketIOProvider, useSocket } = require("use-socketio");
const { last, chain } = require("lodash");

const Backlinks = require("./render-backlinks");
const Markdown = require("./render-markdown");
const useRoute = require("./use-route");

require("tachyons");

const { useState, useEffect } = React;

const RouteNavigation = ({ route }) => {
  return (
    <div className="mt2 f5 mb5">
      <a className="gray no-underline underline-hover" href="/#/">
        Wiki
      </a>
      <span className="dib mh1">/</span>

      {route.map((name, i) => (
        <span key={i}>
          <a
            className="gray no-underline underline-hover"
            href={"/#/" + route.slice(0, i + 1).join("/")}
          >
            {name}
          </a>
          {i < route.length - 1 && <span className="dib mh1">/</span>}
        </span>
      ))}
    </div>
  );
};

const Directory = ({ route, files }) => {
  const dirsAndFiles = chain(files)
    .map(file =>
      route.length ? file.replace(route.join("/") + "/", "") : file
    )
    .map(name => (name.includes("/") ? name.split("/")[0] + "/" : name))
    .uniqBy(name => name)
    .orderBy([name => name.endsWith("/")], ["desc"])
    .value();

  return (
    <div>
      <h1>{last(route) || "Wiki"}</h1>

      <ol className="list pl0 lh-copy">
        {dirsAndFiles.map(name => (
          <li key={name}>
            <a
              className="blue no-underline underline-hover"
              href={"/#/" + path.join(...route, name)}
            >
              {name}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
};

const App = () => {
  const [route, _] = useRoute();
  const [data, setData] = useState(null);

  useSocket("data", data => {
    Object.keys(data.files).forEach(key => {
      data.files[key].mdast = withParents(data.files[key].mdast);
    });

    setData(data);
  });

  useEffect(() => {
    document.title = `${route.length > 0 ? route.join("/") : "/"} · muninn`;
    window.scrollTo(0, 0);
  }, [route]);

  if (!data) {
    return null;
  }

  const file = route.join("/");
  const { mdast } = data.files[file] || {};

  const directoryFiles = Object.keys(data.files).filter(key =>
    key.startsWith(route.join("/"))
  );

  return (
    <div className="mw8 center sans-serif ph4 pb4">
      <RouteNavigation route={route} />

      {mdast ? (
        <>
          <Markdown dir={data.dir} mdast={mdast} route={route} />
          <Backlinks
            dir={data.dir}
            file={file}
            files={data.files}
            route={route}
          />
        </>
      ) : (
        <Directory files={directoryFiles} route={route} />
      )}
    </div>
  );
};

ReactDOM.render(
  <SocketIOProvider>
    <App />
  </SocketIOProvider>,
  document.getElementById("app")
);
