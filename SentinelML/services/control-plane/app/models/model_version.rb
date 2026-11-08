class ModelVersion < ApplicationRecord
  def dto
    {id: id, version: version, active: active, metadata: metadata}
  end
end
