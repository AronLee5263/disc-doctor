import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { RecoilRoot, atom, selector, useRecoilState, useRecoilValue } from "recoil";

import "./index.css";

// import Community, { fetchPosts as fetchPosts } from "./routes/Community";
import Goal from "./routes/Goal";

import NewPost, { action as newPostAction } from "./routes/NewPost";
// import PostDetails, { loader as postDetailsLoader } from "./routes/PostDetails";

import RootLayOut from "./routes/RootLayout";

import RootLayOutLogin from "../src/routes/auth/login/RootLayOutLogin";
import LoginPassword from "./routes/auth/login/LoginPassword";
import LoginEmailLink from "./routes/auth/login/LoginEmailLink";

import RootLayOutSignUp from "./routes/auth/signUp/RootLayOutSignUp";
import SignUpPassword from "./routes/auth/signUp/SignUpPassword";
import SignUpEmailLink from "./routes/auth/signUp/SignUpEmailLink";

const Community = lazy(() => import("./routes/Community"));
// const Goal = lazy(() => import("./routes/Goal"));
const MyInfo = lazy(() => import("./routes/MyInfo"));
const Analysis = lazy(() => import("./routes/Analysis"));

// const NewPost = lazy(() => import("./routes/NewPost"));
// const PostDetails = lazy(() => import("./routes/PostDetails"));

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayOut />,
    children: [
      {
        path: "/",
        element: (
          <Suspense fallback={<p>로딩중입니다...</p>}>
            <Community />
          </Suspense>
        ),
        // loader: () => import("./routes/Community").then((module) => module.loader()),
        // loader: fetchPosts,

        children: [
          {
            path: "create_post",
            element: (
              // <Suspense fallback={<p>로딩중입니다...</p>}>
              <NewPost />
              // </Suspense>
            ),
            action: newPostAction,
            // action: ({ request }) => import("./routes/NewPost").then((module) => module.action({ request })),
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
      {
        path: "/Goal",
        element: (
          <Suspense fallback={<p>로딩중입니다...</p>}>
            <Goal />
          </Suspense>
        ),
      },
      {
        path: "/MyInfo",
        element: (
          <Suspense fallback={<p>로딩중입니다...</p>}>
            <MyInfo />
          </Suspense>
        ),
      },
      {
        path: "/Analysis",
        element: (
          <Suspense fallback={<p>로딩중입니다...</p>}>
            <Analysis />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: "/login",
    element: <RootLayOutLogin />,
    children: [
      {
        path: "with_password",
        element: <LoginPassword />,
      },
      {
        path: "with_email_link",
        element: <LoginEmailLink />,
      },
    ],
  },
  {
    path: "/sign_up",
    element: <RootLayOutSignUp />,
    children: [
      {
        path: "with_password",
        element: <SignUpPassword />,
        // loader: () => import("./routes/Community").then((module) => module.loader()),
      },
      {
        path: "with_email_link",
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
