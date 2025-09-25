// Main application entry point
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Table } from "dynamodb-toolbox";

// Export types and classes for use in tests and other modules
export { DynamoDBClient, DynamoDBDocumentClient, Table };

console.log("GitHub DynamoDB Toolbox Project initialized");
