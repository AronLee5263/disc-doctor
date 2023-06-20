import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { RecoilRoot, atom, selector, useRecoilState, useRecoilValue } from "recoil";

import "./index.css";

import App, { loader as postsLoader } from "./routes/App";
import NewPost, { action as newPostAction } from "./routes/NewPost";
// import PostDetails, { loader as postDetailsLoader } from "./routes/PostDetails";

import RootLayOut from "./routes/RootLayout";

import RootLayOutLogin from "../src/routes/auth/RootLayOutLogin";
import LoginPassword from "./routes/auth/login/LoginPassword";
import LoginEmailLink from "./routes/auth/login/LoginEmailLink";

import RootLayOutSignUp from "./routes/auth/RootLayOutSignUp";
import SignUpPassword from "./routes/auth/SignUpPassword";
import SignUpEmailLink from "./routes/auth/SignUpEmailLink";

// const App = lazy(() => import("./routes/App"));
// const NewPost = lazy(() => import("./routes/NewPost"));
const PostDetails = lazy(() => import("./routes/PostDetails"));

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayOut />,
    children: [
      {
        path: "/",
        element: (
          <Suspense fallback={<p>로딩중입니다...</p>}>
            <App />
          </Suspense>
        ),
        loader: postsLoader,
        children: [
          {
            path: "/create_post",
            element: <NewPost />,
            action: newPostAction,
          },
          // {
          //   path: "/:postId",
          //   element: (
          //     <Suspense fallback={<p>로딩중입니다...</p>}>
          //       <PostDetails />
          //     </Suspense>
          //   ),
          //   loader: () => import("./routes/PostDetails").then((module) => module.loader()),
          // },
        ],
      },
    ],
  },
  {
    path: "/login",
    element: <RootLayOutLogin />,
    children: [
      {
        path: "/login/with_password",
        element: <LoginPassword />,
      },
      {
        path: "/login/with_email_link",
        element: <LoginEmailLink />,
      },
    ],
  },
  {
    path: "/sign_up",
    element: <RootLayOutSignUp />,
    children: [
      {
        path: "/sign_up/with_password",
        element: <SignUpPassword />,
        // loader: () => import("./routes/App").then((module) => module.loader()),
      },
      {
        path: "/sign_up/with_email_link",
        element: <SignUpEmailLink />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RecoilRoot>
      <RouterProvider router={router} />
    </RecoilRoot>
  </React.StrictMode>
);
