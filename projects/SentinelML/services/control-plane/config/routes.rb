Rails.application.routes.draw do
  get "/health", to: "health#show"
  get "/ready", to: "health#ready"
  get "/metrics", to: "health#metrics"
  scope "/api" do
    get "/auth/session", to: "sessions#show"
    post "/auth/login", to: "sessions#create"
    post "/auth/demo", to: "sessions#demo"
    delete "/auth/logout", to: "sessions#destroy"
    get "/dashboard", to: "dashboard#show"
    get "/transactions", to: "assessments#index"
    get "/transactions/:id", to: "assessments#show"
    patch "/alerts/bulk", to: "alerts#bulk_update"
    resources :alerts, only: [:index, :update]
    resources :cases, only: [:index, :show, :update]
    resources :policies, only: [:index, :create, :update]
    get "/models", to: "models#index"
    post "/models/refresh", to: "models#refresh"
    post "/models/:version/activate", to: "models#activate"
    get "/audit", to: "audit#index"
    get "/feedback", to: "feedback#index"
    get "/settings", to: "settings#show"
    patch "/profile", to: "profile#update"
    patch "/organization", to: "organization#update"
    resources :members, only: [:create, :update]
    resources :credentials, only: [:index, :create, :update]
    resources :notifications, only: [:index, :update]
    get "/policy-executions", to: "policy_executions#index"
    get "/reports/transactions.csv", to: "reports#show"
    get "/monitoring", to: "monitoring#show"
    post "/demo/transactions", to: "demo#create"
  end
end
