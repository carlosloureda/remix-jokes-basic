import {
  Link,
  LinksFunction,
  useSearchParams,
  json,
  useActionData,
  ,
} from "remix";
import type { ActionFunction, MetaFunction } from "remix";
import stylesUrl from "../styles/login.css";
import { db } from "~/utils/db.server";
import { createUserSession, login, register } from "~/utils/session.server";

type ActionData = {
  formError?: string;
  fieldErrors?: {
    username: string | undefined;
    password: string | undefined;
  };
  fields?: {
    loginType: string;
    username: string;
    password: string;
  };
};

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export const meta: MetaFunction = () => {
  return {
    title: "Remix Jokes | Login",
    description:
      "Login to submit your own jokes to Remix Jokes!"
  };
};

const badRequest = (data: ActionData) => json(data, { status: 400 });

const validateUsername = (username: string) => {
  if (typeof username !== "string" || username.length < 3) {
    return `Usernames must be at least 3 characters long`;
  }
};

const vaildatePassword = (password: string) => {
  if (typeof password !== "string" || password.length < 6) {
    return `Passwords must be at least 6 characters long`;
  }
};

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  const username = form.get("username");
  const password = form.get("password");
  const loginType = form.get("loginType");
  const redirectTo = form.get("redirectTo") || "/jokes";

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    typeof loginType !== "string" ||
    typeof redirectTo !== "string"
  ) {
    return badRequest({
      formError: `Form not submitted correctly.`,
    });
  }

  const fields = { username, password, loginType };
  const fieldErrors = {
    username: validateUsername(username),
    password: vaildatePassword(password),
  };

  if (Object.values(fieldErrors).some(Boolean)) {
    return badRequest({ fieldErrors, fields });
  }

  switch (loginType) {
    case "login": {
      const user = await login({ username, password });
      if (!user) {
        return badRequest({
          fields,
          formError: "Username/password combination is incorrect",
        });
      }
      return createUserSession(user.id, redirectTo);
    }
    case "register": {
      const userExists = await db.user.findFirst({
        where: { username },
      });
      if (userExists) {
        return badRequest({
          fields,
          formError: `User with username ${username} already exists`,
        });
      }
      const user = await register({ username, password });
      if (!user) {
        return badRequest({
          fields,
          formError: `Something went wrong trying to create a new user.`,
        });
      }
      return createUserSession(user.id, redirectTo);
    }
    default: {
      return badRequest({
        fields,
        formError: `Login type invalid`,
      });
    }
  }
};

export default function Login() {
  const actionData = useActionData<ActionData>();
  const [searchParams] = useSearchParams();

  return (
    <div className="container">
      <div className="content" data-light="">
        <h1>Login</h1>
        <form
          method="post"
          aria-describedby={
            actionData?.formError ? "form-error-message" : undefined
          }
        >
          <input
            type="hidden"
            name="redirectTo"
            value={searchParams.get("redirectTo") ?? undefined}
          />
          <fieldset>
            <legend className="sr-only">Login or Register?</legend>
            <label>
              <input
                type="radio"
                name="loginType"
                value="login"
                defaultChecked={
                  !actionData?.fields?.loginType ||
                  actionData?.fields?.loginType === "login"
                }
              />{" "}
              Login
            </label>
            <label>
              <input
                type="radio"
                name="loginType"
                value="register"
                defaultChecked={actionData?.fields?.loginType === "register"}
              />{" "}
              Register
            </label>
          </fieldset>
          <div>
            <label htmlFor="username-input">Username</label>
            <input
              type="text"
              id="username-input"
              name="username"
              defaultValue={actionData?.fields?.username}
              aria-invalid={Boolean(actionData?.fieldErrors?.username)}
              aria-describedby={
                actionData?.fieldErrors?.username ? "username-error" : undefined
              }
            />
            {actionData?.fieldErrors?.username ? (
              <p
                className="form-validation-error"
                role="alert"
                id="username-error"
              >
                {actionData?.fieldErrors.username}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="password-input">Password</label>
            <input
              id="password-input"
              name="password"
              type="password"
              defaultValue={actionData?.fields?.password}
              aria-invalid={
                Boolean(actionData?.fieldErrors?.password) || undefined
              }
              aria-describedby={
                actionData?.fieldErrors?.password ? "password-error" : undefined
              }
            />
            {actionData?.fieldErrors?.password ? (
              <p
                className="form-validation-error"
                role="alert"
                id="password-error"
              >
                {actionData?.fieldErrors.password}
              </p>
            ) : null}
          </div>
          <div id="form-error-message">
            {actionData?.formError ? (
              <p className="form-validation-error" role="alert">
                {actionData?.formError}
              </p>
            ) : null}
          </div>
          <button type="submit" className="button">
            Submit
          </button>
        </form>
        <div className="links">
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/jokes">Jokes</Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
