class ModelDeployment < ApplicationRecord
  belongs_to :organization
  belongs_to :model_version
end
